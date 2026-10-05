import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { runtimeTestDataStore } from "../apps/helper/runtime-test-data";
import { generateBatchFile } from "../apps/helper/batch-file-generator";

runtimeTestDataStore.clear();

runtimeTestDataStore.setUploadedFileData({
  fileId: "BATCH-123",
  fileName: "Last Uploaded Batch 2026-08-13",
  totalAmount: "R 100.00",
  recordCount: 2,
  status: "PENDINIT",
  createdDate: "2026-08-13T09:00:00.000Z",
  paymentType: "EFT",
});

const saved = runtimeTestDataStore.getLastPersistedUploadedFileData();
assert.ok(saved, "last uploaded batch should be persisted");
assert.equal(saved?.fileId, "BATCH-123");
assert.equal(saved?.fileName, "Last Uploaded Batch 2026-08-13");

const rootDir = path.resolve(__dirname, "..");
const expectedOutputDir = path.join(rootDir, "BatchPerfuploaded");
const generated = generateBatchFile({
  numPayments: 2,
  paymentType: "INT",
  fileName: "Batch Perf Internal 2026-08-13",
  internalTransfer: true,
  userProfile: "TEST_USER_2",
});

assert.equal(path.dirname(generated.filePath), expectedOutputDir, "generated XML should be stored in root BatchPerfuploaded folder");
assert.ok(fs.existsSync(generated.filePath), "generated XML should exist on disk");
assert.ok(fs.existsSync(path.join(expectedOutputDir, "last-uploaded-batch.json")), "last uploaded metadata should be in the same generated folder");

console.log("runtime-test-data last uploaded batch test passed");
