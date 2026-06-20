import TraceabilityExplorer from '../../components/traceability/TraceabilityExplorer.jsx'

export default function TraceabilityView() {
  return (
    <TraceabilityExplorer
      listTitle="Your dispatched batches"
      emptyListMessage="No batches dispatched yet"
      emptyListSubtext="Dispatch a batch to start tracking it here."
    />
  )
}
