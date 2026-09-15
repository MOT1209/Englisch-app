import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 only forwards *synchronous* throws from a handler to the error
 * middleware. A rejection from an `async` handler becomes an unhandled
 * rejection, and on Node 15+ that terminates the process — one failed AI call
 * would take the whole API down for every user. Wrapping the handler forwards
 * the failure to `errorHandler`, which turns it into a normal HTTP response.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
