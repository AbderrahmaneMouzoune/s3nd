import { createInterface } from 'node:readline'

import { CliError } from './errors.js'
import type { Style } from './format.js'

/** Ctrl+C in the middle of a question: not an error, and it exits 130 like any other interrupt. */
export class Cancelled extends CliError {
  constructor() {
    super('Cancelled. Nothing was written.')
    this.name = 'Cancelled'
  }
}

export interface Choice<T extends string> {
  value: T
  label: string
  hint?: string
}

export interface TextOptions {
  default?: string
  /** A line under the question, before the answer: where to find the value. */
  hint?: string
  /** Returns what is wrong with the answer, or nothing. Asked again until it passes. */
  validate?: (value: string) => string | undefined
  /** An empty answer is accepted and comes back as `""`. */
  optional?: boolean
}

export interface Prompter {
  text(question: string, options?: TextOptions): Promise<string>
  /** Like `text`, but what is typed is echoed as dots. */
  secret(question: string, options?: TextOptions): Promise<string>
  choose<T extends string>(question: string, choices: Choice<T>[], defaultValue?: T): Promise<T>
  confirm(question: string, defaultValue: boolean): Promise<boolean>
  /** A line of prose between questions. */
  say(line?: string): void
  close(): void
}

interface PrompterOptions {
  input: NodeJS.ReadableStream & { isTTY?: boolean }
  output: NodeJS.WritableStream & { isTTY?: boolean }
  style: Style
}

/**
 * Questions on stderr, answers from stdin, nothing on stdout: a setup run in
 * `$(…)` still hands back only what the command prints there.
 *
 * Lines are queued as they arrive rather than read one question at a time, so
 * answers piped in all at once (a test, `printf … | s3nd setup`) are not lost
 * between two questions.
 */
export function createPrompter({ input, output, style }: PrompterOptions): Prompter {
  const terminal = Boolean(input.isTTY && output.isTTY)
  const rl = createInterface({ input, output, terminal, historySize: 0 })

  const queued: string[] = []
  let waiting: { resolve: (line: string) => void; reject: (error: Error) => void } | undefined
  let ended = false
  let muted = false
  let prompt = ''

  rl.on('line', (line) => {
    if (waiting) {
      const current = waiting
      waiting = undefined
      current.resolve(line)
    } else {
      queued.push(line)
    }
  })

  rl.on('close', () => {
    ended = true
    if (!waiting) return

    const current = waiting
    waiting = undefined
    current.reject(new CliError('Input ended before setup finished. Nothing was written.'))
  })

  rl.on('SIGINT', () => {
    output.write('\n')
    const current = waiting
    waiting = undefined
    current?.reject(new Cancelled())
    rl.close()
  })

  // readline echoes every keystroke through this one method; while a secret
  // is being typed, the whole line is redrawn as dots instead.
  const internals = rl as unknown as { _writeToOutput(text: string): void; line: string }
  const write = internals._writeToOutput.bind(rl)
  internals._writeToOutput = (text: string) => {
    if (!muted || text.includes('\n')) return write(text)

    write(`\r\u001B[2K${prompt}${'•'.repeat(internals.line.length)}`)
  }

  function readLine(question: string): Promise<string> {
    prompt = question
    rl.setPrompt(question)
    rl.prompt()

    const echo = (line: string) => {
      // Piped answers are not echoed by a terminal, so the transcript would
      // run every question into the next without this.
      if (!terminal) output.write('\n')
      return line
    }

    const next = queued.shift()
    if (next !== undefined) return Promise.resolve(echo(next))
    if (ended) return Promise.reject(new CliError('Input ended before setup finished. Nothing was written.'))

    return new Promise<string>((resolve, reject) => {
      waiting = { resolve: (line) => resolve(echo(line)), reject }
    })
  }

  function label(question: string, suffix?: string): string {
    return `${style.bold('?')} ${question}${suffix ? ` ${style.dim(suffix)}` : ''} `
  }

  async function ask(question: string, options: TextOptions, secret: boolean): Promise<string> {
    if (options.hint) output.write(`${style.dim(`  ${options.hint}`)}\n`)

    const suffix = secret
      ? options.default
        ? '(hidden, Enter keeps the default)'
        : '(hidden)'
      : options.default
        ? `(${options.default})`
        : options.optional
          ? '(optional)'
          : undefined

    for (;;) {
      muted = secret && terminal
      let answer: string
      try {
        answer = (await readLine(label(question, suffix))).trim()
      } finally {
        muted = false
      }

      if (answer === '' && options.default !== undefined) answer = options.default
      if (answer === '' && !options.optional) {
        output.write(`${style.red('  An answer is needed here.')}\n`)
        continue
      }

      const problem = answer === '' ? undefined : options.validate?.(answer)
      if (problem) {
        output.write(`${style.red(`  ${problem}`)}\n`)
        continue
      }

      return answer
    }
  }

  return {
    text: (question, options = {}) => ask(question, options, false),
    secret: (question, options = {}) => ask(question, options, true),

    async choose(question, choices, defaultValue) {
      output.write(`${style.bold('?')} ${question}\n`)

      const width = Math.max(...choices.map((choice) => choice.label.length))
      choices.forEach((choice, index) => {
        const text = choice.hint ? `${choice.label.padEnd(width)}  ${style.dim(choice.hint)}` : choice.label
        output.write(`  ${style.dim(`${index + 1})`)} ${text}\n`)
      })

      const fallback = defaultValue ? choices.findIndex((choice) => choice.value === defaultValue) + 1 : undefined

      for (;;) {
        const answer = (await readLine(label('Pick one', fallback ? `(${fallback})` : '(number)'))).trim()
        const picked = pick(answer === '' && fallback ? String(fallback) : answer, choices)

        if (picked) return picked
        output.write(`${style.red(`  Type a number from 1 to ${choices.length}.`)}\n`)
      }
    },

    async confirm(question, defaultValue) {
      for (;;) {
        const answer = (await readLine(label(question, defaultValue ? '(Y/n)' : '(y/N)'))).trim().toLowerCase()

        if (answer === '') return defaultValue
        if (['y', 'yes', 'o', 'oui'].includes(answer)) return true
        if (['n', 'no', 'non'].includes(answer)) return false

        output.write(`${style.red('  y or n.')}\n`)
      }
    },

    say(line = '') {
      output.write(`${line}\n`)
    },

    close() {
      rl.close()
    },
  }
}

/** A number from the list, or a value or label typed out — or enough of one to be unambiguous. */
function pick<T extends string>(answer: string, choices: Choice<T>[]): T | undefined {
  if (/^\d+$/.test(answer)) return choices[Number(answer) - 1]?.value

  const lowered = answer.toLowerCase()
  if (lowered === '') return undefined

  const exact = choices.find(
    (choice) => choice.value.toLowerCase() === lowered || choice.label.toLowerCase() === lowered,
  )
  if (exact) return exact.value

  const prefixed = choices.filter(
    (choice) => choice.value.toLowerCase().startsWith(lowered) || choice.label.toLowerCase().startsWith(lowered),
  )

  return prefixed.length === 1 ? prefixed[0]!.value : undefined
}
