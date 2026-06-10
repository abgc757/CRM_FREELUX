import { NextRequest, NextResponse } from "next/server";

const BACKEND = (process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = new URL(req.url);
  const target = `${BACKEND}/${path.join("/")}${url.search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");

  const body = req.method === "GET" || req.method === "HEAD" ? undefined : req.body;

  try {
    const res = await fetch(target, {
      method: req.method,
      headers,
      body,
      // @ts-expect-error — Node fetch duplex
      duplex: "half",
    });

    const resHeaders = new Headers(res.headers);
    resHeaders.delete("content-encoding");

    return new NextResponse(res.body, {
      status: res.status,
      headers: resHeaders,
    });
  } catch (err) {
    console.error("[proxy] error:", target, err);
    return NextResponse.json({ detail: "Backend no disponible" }, { status: 502 });
  }
}

export const GET     = handler;
export const POST    = handler;
export const PUT     = handler;
export const PATCH   = handler;
export const DELETE  = handler;
export const OPTIONS = handler;
