'use client';

import { format } from 'date-fns';
import { useEffect, useState } from 'react';

interface FormattedDateProps {
  timestamp?: string;
  formatString?: string;
}

export function FormattedDate({ timestamp, formatString = 'PPP p' }: FormattedDateProps) {
  const [date, setDate] = useState('');

  useEffect(() => {
    if (timestamp) {
      try {
        const parsedDate = new Date(timestamp);
        if (!isNaN(parsedDate.getTime())) {
          setDate(format(parsedDate, formatString));
        } else {
          setDate('Invalid Date');
        }
      } catch (error) {
        console.error('Failed to format date:', error);
        setDate('Invalid Date');
      }
    } else {
      setDate('Not available');
    }
  }, [timestamp, formatString]);

  return <>{date || '...'}</>;
}
