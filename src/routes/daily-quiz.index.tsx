import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/daily-quiz/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/daily-quiz/"!</div>
}
