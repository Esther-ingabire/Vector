import TraceabilityExplorer from '../../components/traceability/TraceabilityExplorer.jsx'

export default function DistributorTraceability() {
  return (
    <TraceabilityExplorer
      listTitle="Your batches"
      emptyListMessage="No batches yet"
      emptyListSubtext="Batches dispatched to you will appear here once they're in transit."
    />
  )
}
