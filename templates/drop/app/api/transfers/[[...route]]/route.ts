import { transfers } from '@/lib/transfers'

export const dynamic = 'force-dynamic'

/**
 * The transfer protocol, on this deployment:
 *
 *   POST   /api/transfers            create a transfer, get the code back
 *   GET    /api/transfers/:code      metadata
 *   GET    /api/transfers/:code/raw  the bytes
 *   DELETE /api/transfers/:code      burn it
 *
 * The CLI works against it too:
 *   s3nd put ./file --remote https://your.drop/api/transfers --token <password>
 */
export const GET = (request: Request) => transfers()(request)
export const POST = (request: Request) => transfers()(request)
export const DELETE = (request: Request) => transfers()(request)
