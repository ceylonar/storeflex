
'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeError, Html5QrcodeResult } from 'html5-qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { CameraOff } from 'lucide-react';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

const BarcodeScanner = ({ open, onClose, onScanSuccess }: BarcodeScannerProps) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [hasPermission, setHasPermission] = useState(true);

  useEffect(() => {
    if (open && scannerRef.current) {
        const scanner = new Html5QrcodeScanner(
            scannerRef.current.id,
            { fps: 10, qrbox: { width: 250, height: 150 } },
            false
        );

        const handleSuccess = (decodedText: string, result: Html5QrcodeResult) => {
            scanner.clear();
            onScanSuccess(decodedText);
        };

        const handleError = (error: Html5QrcodeError) => {
             if (error.name === "NotAllowedError" || error.message.toLowerCase().includes('permission denied')) {
                setHasPermission(false);
            }
        };

        scanner.render(handleSuccess, handleError);

        return () => {
             // Cleanup scanner on component unmount or dialog close
             if (scanner) {
                try {
                    scanner.clear().catch(err => console.error("Failed to clear scanner:", err));
                } catch(err) {
                     console.error("Error during scanner cleanup:", err);
                }
            }
        };
    }
  }, [open, onScanSuccess]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
          <DialogDescription>
            Point your camera at a barcode to scan it.
          </DialogDescription>
        </DialogHeader>
        <div id="barcode-scanner" ref={scannerRef} className="w-full" />
         {!hasPermission && (
            <Alert variant="destructive">
                <CameraOff className="h-4 w-4" />
                <AlertTitle>Camera Permission Denied</AlertTitle>
                <AlertDescription>
                    Please grant camera access in your browser settings to use the barcode scanner.
                </AlertDescription>
            </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;
