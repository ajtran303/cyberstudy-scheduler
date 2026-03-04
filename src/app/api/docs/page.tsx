"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-4">
        <h1 className="mb-4 text-2xl font-mono font-bold text-foreground">
          CyberStudy API Documentation
        </h1>
        <SwaggerUI url="/api/v1/openapi.json" />
      </div>
    </div>
  );
}
