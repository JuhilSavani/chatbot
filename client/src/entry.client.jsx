import { HydratedRouter } from "react-router/dom";
import { hydrateRoot } from "react-dom/client";
import { startTransition } from "react";

startTransition(() => {
  hydrateRoot(
    document,
    <HydratedRouter />
  );
});
