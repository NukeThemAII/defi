"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { PropsWithChildren } from "react";
import { useState } from "react";

import { createQueryClient } from "@/src/lib/queryClient";

export function QueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

