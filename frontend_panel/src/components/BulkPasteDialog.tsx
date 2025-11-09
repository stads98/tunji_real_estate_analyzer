import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertTriangle, Home, Copy } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { BulkProperty, parseZillowBulkFavorites } from '../utils/zillowBulkParser';

interface BulkPasteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (properties: BulkProperty[]) => void;
}

export function BulkPasteDialog({ open, onOpenChange, onImport }: BulkPasteDialogProps) {
  const [pastedText, setPastedText] = useState('');
  const [parsedProperties, setParsedProperties] = useState<BulkProperty[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleParse = () => {
    const properties = parseZillowBulkFavorites(pastedText);
    setParsedProperties(properties);
    setShowPreview(true);
  };

  const handleImport = () => {
    if (parsedProperties.length > 0) {
      onImport(parsedProperties);
      // Reset state
      setPastedText('');
      setParsedProperties([]);
      setShowPreview(false);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setPastedText('');
    setParsedProperties([]);
    setShowPreview(false);
    onOpenChange(false);
  };

  const exampleText = `$325,000
3 bds2 ba1,354 sqftHouse for sale
75 NW 83rd St, Miami, FL 33150
MLS ID #A11903191, Julies Realty, LLC

Compare
$315,000
2 bds1 ba1,121 sqftHouse for sale
1935 SW 67th Ter, North Lauderdale, FL 33068
MLS ID #F10532733, EXP Realty LLC`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Bulk Paste Zillow Favorites
          </DialogTitle>
          <DialogDescription>
            Paste your Zillow favorites list to quickly create multiple deals in Stage 1 for your team
          </DialogDescription>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-4">
            <Alert>
              <Home className="h-4 w-4" />
              <AlertDescription>
                <strong>How to use:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>Go to your Zillow favorites</li>
                  <li>Copy the entire list (Ctrl+A, Ctrl+C)</li>
                  <li>Paste it here</li>
                  <li>Click "Parse & Preview"</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div>
              <label className="text-sm font-medium">Paste Zillow Favorites:</label>
              <Textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={exampleText}
                className="mt-2 h-[200px] resize-none font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-2">
                The parser will automatically extract: Address, Price, Beds, Baths, and Square Footage
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleParse}
                disabled={!pastedText.trim()}
              >
                Parse & Preview
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">
                    {parsedProperties.length} {parsedProperties.length === 1 ? 'property' : 'properties'} found
                  </p>
                  <p className="text-sm text-green-700">
                    All will be created in Stage 1 (Needs Basic Data)
                  </p>
                </div>
              </div>
              <Badge className="bg-gray-100 border-gray-300 text-gray-700">
                Stage 1
              </Badge>
            </div>

            <div>
              <h3 className="font-medium mb-2">Preview:</h3>
              <ScrollArea className="h-[400px] border rounded-lg p-4">
                <div className="space-y-3">
                  {parsedProperties.map((property, index) => (
                    <div 
                      key={index}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{property.address}</p>
                          {property.mlsId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              MLS: {property.mlsId}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="ml-2">
                          #{index + 1}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Price:</span>
                          <p className="font-medium">
                            ${property.price.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Beds:</span>
                          <p className="font-medium">
                            {property.beds || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Baths:</span>
                          <p className="font-medium">
                            {property.baths || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sqft:</span>
                          <p className="font-medium">
                            {property.sqft ? property.sqft.toLocaleString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {parsedProperties.length === 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No properties could be parsed. Make sure you copied the entire Zillow favorites list.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Back to Edit
              </Button>
              <Button 
                onClick={handleImport}
                disabled={parsedProperties.length === 0}
              >
                Import {parsedProperties.length} {parsedProperties.length === 1 ? 'Deal' : 'Deals'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
