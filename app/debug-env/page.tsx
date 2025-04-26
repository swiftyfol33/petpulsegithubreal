import { EnvDebug } from "@/components/env-debug"

export default function DebugEnvPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Environment Debug</h1>
      <EnvDebug />
    </div>
  )
}
