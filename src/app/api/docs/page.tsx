"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function DocsPage() {
  return (
    <div className="swagger-docs min-h-screen bg-white text-gray-900">
      <style>{`
        .swagger-docs .swagger-ui,
        .swagger-docs .swagger-ui .wrapper,
        .swagger-docs .swagger-ui .opblock-body,
        .swagger-docs .swagger-ui section.models,
        .swagger-docs .swagger-ui .scheme-container {
          background: white;
          color: #3b4151;
        }
        .swagger-docs .swagger-ui .opblock .opblock-summary-description,
        .swagger-docs .swagger-ui .opblock-description-wrapper p,
        .swagger-docs .swagger-ui .response-col_description__inner p,
        .swagger-docs .swagger-ui table thead tr td,
        .swagger-docs .swagger-ui table thead tr th,
        .swagger-docs .swagger-ui .parameter__name,
        .swagger-docs .swagger-ui .parameter__type,
        .swagger-docs .swagger-ui .response-col_status,
        .swagger-docs .swagger-ui .response-col_links {
          color: #3b4151;
        }
        .swagger-docs .swagger-ui .opblock-tag {
          color: #3b4151;
          border-bottom: 1px solid #e0e0e0;
        }
        .swagger-docs .swagger-ui .opblock {
          border-color: #e0e0e0;
        }
        .swagger-docs .swagger-ui .btn {
          color: #3b4151;
        }
        .swagger-docs .swagger-ui .btn.authorize {
          color: #49cc90;
          border-color: #49cc90;
        }
        .swagger-docs .swagger-ui select {
          color: #3b4151;
          background: white;
        }
        .swagger-docs .swagger-ui input {
          color: #3b4151;
          background: white;
        }
        .swagger-docs .swagger-ui .info .title,
        .swagger-docs .swagger-ui .info p,
        .swagger-docs .swagger-ui .info a {
          color: #3b4151;
        }
      `}</style>
      <div className="mx-auto max-w-7xl p-4">
        <h1 className="mb-4 text-2xl font-mono font-bold">
          CyberStudy API Documentation
        </h1>
        <SwaggerUI url="/api/v1/openapi.json" />
      </div>
    </div>
  );
}
