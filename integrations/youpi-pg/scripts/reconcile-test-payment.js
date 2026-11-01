import { PaymentObserverClient } from '@youpi/observer-sdk';
import { BankSmsParser } from '../apps/sms-observer/src/sms-parser.js';

export async function ingestLiveSms(rawText) {
  const parsed = BankSmsParser.parse(rawText);
  if (!parsed) {
    console.log('[Ingest] Could not parse SMS:', rawText);
    return null;
  }

  console.log('[Ingest] Parsed incoming bank SMS:');
  console.log(`  Amount: ₹${parsed.amount}`);
  console.log(`  Bank Ref / UTR: ${parsed.bankReferenceNumber || 'N/A'}`);
  console.log(`  Account Mask: ${parsed.accountMask || 'N/A'}`);
  console.log(`  Sender VPA: ${parsed.senderVpa || 'N/A'}`);

  const client = new PaymentObserverClient({
    apiBaseUrl: process.env.PAYMENT_API_URL || 'http://localhost:6100',
    sourceName: 'GOOGLE_MESSAGES'
  });

  const result = await client.submitObservation({
    receivingAccountId: '00000000-0000-0000-0000-000000000002',
    amountPaise: parsed.amountPaise,
    amount: parsed.amount,
    observedAt: parsed.observedAt,
    bankReferenceNumber: parsed.bankReferenceNumber,
    senderVpa: parsed.senderVpa,
    sender: 'HDFC-BANK-SMS',
    rawText: parsed.rawText,
    rawPayload: {
      text: parsed.rawText,
      sender: 'HDFC-BANK-SMS'
    }
  });

  console.log('[Ingest] Attribution result:', JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[2]) {
  ingestLiveSms(process.argv[2]).catch(console.error);
}
