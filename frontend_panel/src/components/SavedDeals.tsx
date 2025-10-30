import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, FileText } from 'lucide-react';

interface SavedDealsProps {
  onBack: () => void;
}

export function SavedDeals({ onBack }: SavedDealsProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Saved Deals</CardTitle>
            <CardDescription>View and manage your analyzed properties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="mb-2">No Saved Deals Yet</h3>
              <p className="text-muted-foreground mb-6">
                Deals you analyze will appear here for easy access and comparison.
              </p>
              <p className="text-muted-foreground">
                Connect to Supabase to enable deal saving and sharing functionality.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
