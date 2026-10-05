import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { getCreationDateTime, getPaymentDate, PaymentDateSituation } from "./generic-methods";

/**
 * BatchFileGenerator - Generates dynamic batch payment XML files
 * with unique identifiers and calculated values.
 *
 * Supports:
 * - Dynamic number of transactions (1 to N)
 * - Multiple user profiles for different test scenarios
 * - Configurable payment types
 *
 * @author Shadab Anwar
 */

const ROOT_DIR = path.resolve(__dirname, "../..");
const OUTPUT_DIR = path.join(ROOT_DIR, "BatchPerfuploaded");

// ─────────────────────────────────────────────────────────────────────────────
// User Profiles
// ─────────────────────────────────────────────────────────────────────────────

export interface UserProfile {
  companyId: string;
  userId: string;
  debitAccount: string;
  channel?: string;
}

/**
 * Predefined user profiles for testing.
 * Add new profiles here as needed.
 */
export const USER_PROFILES: Record<string, UserProfile> = {
  BEW_USER: {
    companyId: "1805",
    userId: "8865",
    debitAccount: "1300307803582",
    channel: "WEB",
  },
  SARS_USER: {
    companyId: "1805",
    userId: "8865",
    debitAccount: "1300307803582",
    channel: "WEB",
  },
  TEST_USER_1: {
    companyId: "1805",
    userId: "8865",
    debitAccount: "1300307803582",
    channel: "WEB",
  },
  TEST_USER_2: {
    companyId: "1805",
    userId: "8866",
    debitAccount: "1300307803583",
    channel: "WEB",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface Transaction {
  /** Beneficiary ID or ERP ID */
  creditAccountId: string;
  /** Scheme: BENEID, ERPID, etc. */
  creditAccountScheme?: string;
  /** Bank/clearing member id used in internal transfer */
  creditorMemberId?: string;
  /** Payment amount */
  amount: number;
  /** Remittance info / reference */
  remittanceInfo?: string;
  /** End-to-end ID */
  endToEndId?: string;
  /** Notify beneficiary (Y/N) */
  notify?: string;
  /** Email for notification */
  email?: string;
}

export interface BatchFileOptions {
  /** User profile key (looks up from USER_PROFILES) */
  userProfile?: string;
  /** Company ID (default: 1805) - overrides userProfile if provided */
  companyId?: string;
  /** User ID (default: 8865) - overrides userProfile if provided */
  userId?: string;
  /** Channel (default: WEB) */
  channel?: string;
  /** Debit account number - overrides userProfile if provided */
  debitAccount?: string;
  /** Currency (default: ZAR) */
  currency?: string;
  /** Payment type (default: EFT) */
  paymentType?: string;
  /** Marks this file as internal transfer payment type */
  internalTransfer?: boolean;
  /** Overrides local instrument in XML (<PmtTpInf>/<LclInstrm>/<Prtry>) */
  localInstrument?: string;
  /**
   * Payment date logic based on situation:
   * - "present": Today
   * - "past": 2 days ago
   * - "past-week": 7 days ago
   * - "future": 3 days from now
   * - "future-week": 7 days from now
   * - "next-working-day": Next weekday
   * Default: "future" (payment date 3 days from now)
   */
  paymentDateSituation?: PaymentDateSituation;
  /** Explicit payment date (YYYY-MM-DD) - overrides paymentDateSituation if provided */
  paymentDate?: string;
  /**
   * Minutes ahead for creation datetime (CreDtTm).
   * Default: 5 (creation time is 5 minutes in the future)
   */
  creationTimeOffset?: number;
  /** File name */
  fileName?: string;
  /** File description */
  fileDesc?: string;
  /** Original CSV file name */
  origFileName?: string;
  /** Single debit flag (default: false) */
  singleDebit?: string;
  /** Allow duplicate flag (default: false) */
  allowDuplicate?: string | boolean;
  /** Transactions to include (if provided, numPayments is ignored) */
  transactions?: Transaction[];
  /**
   * Number of auto-generated payments to create.
   * Ignored if `transactions` array is provided.
   * Default: 2
   */
  numPayments?: number;
  /** Base amount for auto-generated payments (default: 50) */
  baseAmount?: number;
  /** Auto-generated credit accounts pool */
  creditAccounts?: string[];
  /** Default credit account scheme for auto-generated transactions */
  creditAccountSchemeDefault?: string;
  /** Creditor clearing member id for internal transfer */
  creditMemberId?: string;
}

export interface GeneratedBatchFile {
  /** Full path to the generated XML file */
  filePath: string;
  /** File name */
  fileName: string;
  /** Display name shown in the UI (FileMetadata/FileName) */
  displayName: string;
  /** Message ID */
  msgId: string;
  /** Number of transactions */
  nbOfTxs: number;
  /** Control sum (total amount) */
  ctrlSum: string;
  /** Payment date */
  paymentDate: string;
  /** Creation datetime */
  creationDateTime: string;
  /** Generated XML content */
  xmlContent: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a unique Message ID with timestamp.
 */
function generateMsgId(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const random = crypto.randomBytes(2).toString("hex");
  return `Batch${timestamp}-${random}`;
}

/**
 * Formats creation datetime as ISO without timezone (CreDtTm format).
 * Defaults to 5 minutes in the future as per requirement.
 */
function formatCreationDateTime(minutesAhead: number = 5): string {
  return getCreationDateTime(minutesAhead);
}

/**
 * Resolves the payment date based on options.
 */
function resolvePaymentDate(
  explicitDate?: string,
  situation?: PaymentDateSituation
): string {
  if (explicitDate) {
    return explicitDate;
  }
  return getPaymentDate(situation || "future");
}

/**
 * Generates a unique PmtInfId.
 */
function generatePmtInfId(index: number): string {
  const timestamp = Date.now().toString(36);
  return `Pmt${timestamp}-${index + 1}`;
}

/**
 * Generates a unique InstrId.
 */
function generateInstrId(index: number): string {
  const uuid = crypto.randomUUID().slice(0, 8);
  return `FILE-${uuid}-${index + 1}`;
}

/**
 * Calculates hash code for file integrity (simplified).
 */
function calculateHashCode(content: string): string {
  return crypto.createHash("md5").update(content).digest("base64");
}

function normalizeBooleanFlag(value: string | boolean | undefined, defaultValue: "true" | "false" = "false"): "true" | "false" {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return "true";
    if (normalized === "false") return "false";
  }
  return defaultValue;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-generates N transactions with sequential amounts.
 *
 * @param count - Number of transactions to generate
 * @param baseAmount - Base amount for each transaction (default: 50)
 * @returns Array of generated transactions
 */
function generateTransactions(
  count: number,
  baseAmount: number = 50,
  options?: {
    creditAccounts?: string[];
    creditAccountScheme?: string;
    creditorMemberId?: string;
  }
): Transaction[] {
  const transactions: Transaction[] = [];
  const configuredAccounts = Array.isArray(options?.creditAccounts)
    ? options!.creditAccounts.filter((item) => String(item || "").trim().length > 0)
    : [];

  for (let i = 0; i < count; i++) {
    const creditAccountId = configuredAccounts.length > 0
      ? configuredAccounts[i % configuredAccounts.length]
      : "101355";

    transactions.push({
      creditAccountId,
      creditAccountScheme: options?.creditAccountScheme || "BENEID",
      creditorMemberId: options?.creditorMemberId,
      amount: baseAmount + i,
      remittanceInfo: `Auto-generated payment ${i + 1}`,
      endToEndId: `E2E-AUTO-${Date.now()}-${i + 1}`,
      notify: i % 2 === 0 ? "Y" : "N",
      email: i % 2 === 0 ? "test@example.com" : "",
    });
  }
  return transactions;
}

// ─────────────────────────────────────────────────────────────────────────────
// XML Generation (Dynamic - No Template Dependency for Transactions)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the PmtInf XML block for a single transaction.
 */
function buildPmtInfXml(
  index: number,
  transaction: Transaction,
  options: {
    paymentType: string;
    localInstrument: string;
    paymentDate: string;
    debitAccount: string;
    currency: string;
    includeCreditorAgent: boolean;
  }
): string {
  const pmtInfId = generatePmtInfId(index);
  const instrId = generateInstrId(index);
  const e2eId = transaction.endToEndId || `E2E-${Date.now()}-${index + 1}`;
  const amount = transaction.amount.toFixed(2);
  const creditAccount = transaction.creditAccountId;
  const creditScheme = transaction.creditAccountScheme || "BENEID";
  const remittance = transaction.remittanceInfo || `Payment reference ${index + 1}`;
  const notify = transaction.notify || "N";
  const email = transaction.email || "";
  const creditorAgentXml = options.includeCreditorAgent && transaction.creditorMemberId
    ? `
        <CdtrAgt>
          <FinInstnId>
            <ClrSysMmbId>
              <MmbId>${transaction.creditorMemberId}</MmbId>
            </ClrSysMmbId>
          </FinInstnId>
        </CdtrAgt>`
    : "";

  return `
    <PmtInf>
      <PmtInfId>${pmtInfId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${amount}</CtrlSum>
      <PmtTpInf>
        <LclInstrm>
          <Prtry>${options.localInstrument}</Prtry>
        </LclInstrm>
      </PmtTpInf>
      <ReqdExctnDt>
        <Dt>${options.paymentDate}</Dt>
      </ReqdExctnDt>
      <DbtrAcct>
        <Id>
          <Othr>
            <Id>${options.debitAccount}</Id>
          </Othr>
        </Id>
        <Ccy>${options.currency}</Ccy>
      </DbtrAcct>
      <CdtTrfTxInf>
        <PmtId>
          <InstrId>${instrId}</InstrId>
          <EndToEndId>${e2eId}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="${options.currency}">${amount}</InstdAmt>
        </Amt>
        <CdtrAcct>
          <Id>
            <Othr>
              <Id>${creditAccount}</Id>
              <SchmeNm>
                <Prtry>${creditScheme}</Prtry>
              </SchmeNm>
            </Othr>
          </Id>
        </CdtrAcct>
${creditorAgentXml}
        <RmtInf>
          <Ustrd>${remittance}</Ustrd>
        </RmtInf>
        <SplmtryData>
          <PlcAndNm>BeneficiaryNotification</PlcAndNm>
          <Envlp>
            <Ntfy>${notify}</Ntfy>
            <Email>${email}</Email>
          </Envlp>
        </SplmtryData>
      </CdtTrfTxInf>
    </PmtInf>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a batch payment XML file with dynamic transactions.
 *
 * @param options - Batch file configuration
 * @returns Generated file details
 *
 * @example
 * // Generate with 5 auto-generated payments
 * generateBatchFile({ numPayments: 5, paymentType: "EFT", userType: "BEW_USER" });
 *
 * // Generate with custom transactions
 * generateBatchFile({ transactions: [...], paymentType: "SARS" });
 */
export function generateBatchFile(options: BatchFileOptions): GeneratedBatchFile {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Resolve user profile
  let userProfile: UserProfile | undefined;
  if (options.userProfile && USER_PROFILES[options.userProfile]) {
    userProfile = USER_PROFILES[options.userProfile];
  }

  // Resolve final values (explicit options > userProfile > defaults)
  const companyId = options.companyId || userProfile?.companyId || "1805";
  const userId = options.userId || userProfile?.userId || "8865";
  const debitAccount = options.debitAccount || userProfile?.debitAccount || "1300307803582";
  const channel = options.channel || userProfile?.channel || "WEB";
  const currency = options.currency || "ZAR";
  const paymentType = options.paymentType || "EFT";
  const isInternalTransfer = options.internalTransfer === true || /internal/i.test(paymentType);
  const localInstrument = options.localInstrument || "EFT";
  const singleDebit = normalizeBooleanFlag(options.singleDebit, "false");
  const allowDuplicate = normalizeBooleanFlag(options.allowDuplicate, "false");

  // Resolve transactions: explicit array > auto-generated
  let transactions: Transaction[];
  if (options.transactions && options.transactions.length > 0) {
    transactions = options.transactions;
  } else {
    const numPayments = options.numPayments || 2;
    const baseAmount = options.baseAmount || 50;
    transactions = generateTransactions(numPayments, baseAmount, {
      creditAccounts: options.creditAccounts,
      creditAccountScheme: options.creditAccountSchemeDefault || (isInternalTransfer ? "ACCT" : "BENEID"),
      creditorMemberId: isInternalTransfer ? options.creditMemberId || "250655" : undefined,
    });
  }

  // Calculate values
  const nbOfTxs = transactions.length;
  const ctrlSum = transactions.reduce((sum, t) => sum + t.amount, 0);
  const msgId = generateMsgId();
  const creationDateTime = formatCreationDateTime(options.creationTimeOffset || 5);
  const paymentDate = resolvePaymentDate(options.paymentDate, options.paymentDateSituation);

  // Build transaction XML blocks
  const pmtInfBlocks = transactions
    .map((tx, idx) =>
      buildPmtInfXml(idx, tx, {
        paymentType,
        localInstrument,
        paymentDate,
        debitAccount,
        currency,
        includeCreditorAgent: isInternalTransfer,
      })
    )
    .join("\n");

  // Compute display name (shown in UI)
  const defaultFilePrefix = isInternalTransfer ? "Batch Test Internal" : "Batch Test";
  const displayName = options.fileName || `${defaultFilePrefix} ${new Date().toISOString().slice(0, 10)} ${Date.now().toString(36).toUpperCase()}`;

  // Build full XML
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${ctrlSum.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Id>
          <OrgId>
            <Othr>
              <Id>${companyId}</Id>
              <SchmeNm>
                <Prtry>COMPANYID</Prtry>
              </SchmeNm>
            </Othr>
            <Othr>
              <Id>${userId}</Id>
              <SchmeNm>
                <Prtry>USERID</Prtry>
              </SchmeNm>
            </Othr>
            <Othr>
              <Id>${channel}</Id>
              <SchmeNm>
                <Prtry>CHANNEL</Prtry>
              </SchmeNm>
            </Othr>
          </OrgId>
        </Id>
      </InitgPty>
      <SplmtryData>
        <PlcAndNm>FileMetadata</PlcAndNm>
        <Envlp>
          <FileType>CSV</FileType>
          <TemplateVersion>V2</TemplateVersion>
          <FileName>${displayName}</FileName>
          <FileDesc>${options.fileDesc || "Automated batch payment test"}</FileDesc>
          <OrigFileName>${options.origFileName || `batch_test_${Date.now()}.csv`}</OrigFileName>
          <SingleDebit>${singleDebit}</SingleDebit>
          <Encrypted>false</Encrypted>
          <AutoInitiate>false</AutoInitiate>
          <HashCode>placeholder</HashCode>
          <FileSizeBytes>0</FileSizeBytes>
          <AllowDuplicate>${allowDuplicate}</AllowDuplicate>
        </Envlp>
      </SplmtryData>
    </GrpHdr>
${pmtInfBlocks}
  </CstmrCdtTrfInitn>
</Document>`;

  // Calculate hash and file size
  const hash = calculateHashCode(xmlContent);
  const fileSize = Buffer.byteLength(xmlContent, "utf-8");

  // Update hash and size in the XML
  const finalXml = xmlContent
    .replace("placeholder", hash)
    .replace("<FileSizeBytes>0</FileSizeBytes>", `<FileSizeBytes>${fileSize}</FileSizeBytes>`);

  // Write to file
  const fileName = `batch_${Date.now()}_${msgId.slice(-8)}.xml`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  fs.writeFileSync(filePath, finalXml, "utf-8");

  console.log(`[BatchFileGenerator] Generated: ${filePath}`);
  console.log(`[BatchFileGenerator] MsgId: ${msgId}, Txs: ${nbOfTxs}, Sum: ${ctrlSum}`);
  console.log(`[BatchFileGenerator] User: ${userId}, Company: ${companyId}, PaymentType: ${paymentType}`);

  return {
    filePath,
    fileName,
    displayName,
    msgId,
    nbOfTxs,
    ctrlSum: ctrlSum.toFixed(2),
    paymentDate,
    creationDateTime,
    xmlContent: finalXml,
  };
}

/**
 * Reads an existing XML file and returns its content.
 */
export function readBatchFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Batch file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Gets the output directory path for generated batch files.
 */
export function getOutputDirectory(): string {
  return OUTPUT_DIR;
}
