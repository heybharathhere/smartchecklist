import { Link } from 'react-router-dom';
import { Button, EmptyState } from '@/components/ui/primitives';

export default function NotFound() {
  return (
    <EmptyState
      title="That page does not exist"
      body="The link may be out of date. Everything else is still here."
      action={
        <Link to="/">
          <Button variant="primary">Back to dashboard</Button>
        </Link>
      }
    />
  );
}
