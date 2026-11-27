// The portal already attaches the signed-in user's token to every server
// function call (src/routes/__root.tsx), so this is a pass-through.
import { createMiddleware } from "@tanstack/react-start";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => next());
