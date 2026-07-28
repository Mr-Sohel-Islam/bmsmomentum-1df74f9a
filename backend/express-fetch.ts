import { app } from "./app";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { Readable } from "node:stream";

export async function handleApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api")) {
    return null;
  }

  return new Promise((resolve) => {
    let reqBody: Readable;
    if (request.body) {
      reqBody = Readable.fromWeb(request.body as import("node:stream/web").ReadableStream);
    } else {
      reqBody = new Readable({
        read() {
          this.push(null);
        },
      });
    }

    const req = Object.assign(reqBody, {
      url: url.pathname + url.search,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      httpVersion: "1.1",
      httpVersionMajor: 1,
      httpVersionMinor: 1,
      socket: new Socket(),
    }) as unknown as IncomingMessage;

    const res = new ServerResponse(req);
    const responseHeaders = new Headers();
    const chunks: Buffer[] = [];

    res.setHeader = (name: string, value: string | number | readonly string[]) => {
      if (Array.isArray(value)) {
        responseHeaders.delete(name);
        for (const item of value) {
          responseHeaders.append(name, String(item));
        }
      } else {
        responseHeaders.set(name, String(value));
      }
      return res;
    };

    res.getHeader = (name: string) => responseHeaders.get(name) ?? undefined;

    res.write = (chunk: unknown) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return true;
    };

    res.end = (chunk?: unknown) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      const body = Buffer.concat(chunks);
      resolve(
        new Response(body, {
          status: res.statusCode || 200,
          headers: responseHeaders,
        }),
      );
      return res;
    };

    app(req, res);
  });
}
