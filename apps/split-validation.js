const fs = require("fs");
const path = require("path");

// ============================================================
// Usage:
// node split-validation.js "<html-file-path>" <FM-validation-seconds>
//
// Example:
// node split-validation.js "..\reports\performance\bulk-payments-report.html" 25.99
// ============================================================

const [, , inputFile, fmArg] = process.argv;

// ------------------------------------------------------------
// Validate command-line arguments
// ------------------------------------------------------------

if (!inputFile || fmArg === undefined) {
    console.error(
        'Usage: node split-validation.js "<html-file-path>" <FM-validation-seconds>'
    );
    process.exit(1);
}

const fmTime = Number(fmArg);

if (!Number.isFinite(fmTime) || fmTime < 0) {
    console.error(
        "ERROR: FM Validation value must be a valid positive number."
    );
    process.exit(1);
}

// ------------------------------------------------------------
// Validate source HTML file
// ------------------------------------------------------------

const resolvedInputFile = path.resolve(inputFile);

if (!fs.existsSync(resolvedInputFile)) {
    console.error(`ERROR: File not found: ${resolvedInputFile}`);
    process.exit(1);
}

let html = fs.readFileSync(resolvedInputFile, "utf8");

// ------------------------------------------------------------
// Locate ONLY the File Validation timeline bar
//
// Expected structure:
//
// <div class="lt-bar lt-validation" ...>
//     File Validation
//     476.69s
// </div>
//
// No other timeline bars are modified.
// ------------------------------------------------------------

const barRegex =
    /<div\b([^>]*class=["'][^"']*\blt-bar\b[^"']*\blt-validation\b[^"']*["'][^>]*)>([\s\S]*?File Validation[\s\S]*?)<\/div>/i;

const match = html.match(barRegex);

if (!match) {
    console.error(
        "ERROR: File Validation bar could not be found."
    );
    console.error("No changes were made.");
    process.exit(1);
}

const originalBar = match[0];

// ------------------------------------------------------------
// Extract File Validation duration
//
// Example:
// File Validation 476.69s
// ------------------------------------------------------------

const durationMatches = [
    ...originalBar.matchAll(/(\d+(?:\.\d+)?)\s*s\b/gi)
];

if (durationMatches.length === 0) {
    console.error(
        "ERROR: Could not determine File Validation duration from the bar."
    );
    console.error("No changes were made.");
    process.exit(1);
}

// Use the last seconds value located inside the validation bar.
const totalValidation = Number(
    durationMatches[durationMatches.length - 1][1]
);

if (
    !Number.isFinite(totalValidation) ||
    totalValidation <= 0
) {
    console.error(
        "ERROR: Invalid File Validation duration."
    );
    process.exit(1);
}

if (fmTime > totalValidation) {
    console.error(
        `ERROR: FM Validation (${fmTime}s) cannot exceed File Validation (${totalValidation}s).`
    );
    process.exit(1);
}

// ------------------------------------------------------------
// Calculate IBOL Validation
// ------------------------------------------------------------

const ibolTime = totalValidation - fmTime;

const fmPercent =
    (fmTime / totalValidation) * 100;

const ibolPercent =
    100 - fmPercent;

// ------------------------------------------------------------
// Extract original bar opening tag
// ------------------------------------------------------------

const openingTagMatch =
    originalBar.match(/^<div\b[^>]*>/i);

if (!openingTagMatch) {
    console.error(
        "ERROR: Unable to parse File Validation bar."
    );
    process.exit(1);
}

let openingTag = openingTagMatch[0];

// ------------------------------------------------------------
// IMPORTANT
//
// Existing .lt-bar CSS may contain:
//
// overflow:hidden
//
// That would cut FM Validation text because FM is a very
// small percentage of the complete validation bar.
//
// Force overflow visible on THIS BAR ONLY.
// ------------------------------------------------------------

if (/style=["']/i.test(openingTag)) {

    openingTag = openingTag.replace(
        /style=(["'])(.*?)\1/i,
        (full, quote, styleContent) => {

            let updatedStyle = styleContent;

            if (/overflow\s*:/i.test(updatedStyle)) {

                updatedStyle =
                    updatedStyle.replace(
                        /overflow\s*:\s*[^;]+;?/gi,
                        "overflow:visible;"
                    );

            } else {

                updatedStyle +=
                    ";overflow:visible;";
            }

            return `style=${quote}${updatedStyle}${quote}`;
        }
    );

} else {

    openingTag =
        openingTag.replace(
            />$/,
            ' style="overflow:visible;">'
        );
}

// ------------------------------------------------------------
// Create split validation bar
//
// BAR WIDTH:
//
// |-- FM --|---------------- IBOL ----------------|
//
// FM width   = actual FM percentage
// IBOL width = actual remaining percentage
//
// Labels DO NOT control bar dimensions.
//
// FM label can overflow visually so that:
// "FM Validation 25.99s"
// is always readable.
//
// No modification is made to the other timeline stages.
//
// A caption is added directly under the validation graph:
//
// File Validation
// (Upload to Pending Initiation)
// ------------------------------------------------------------

const newBar = `${openingTag}
  <div
    class="validation-split-wrapper"
    style="
      display:flex;
      width:100%;
      height:100%;
      position:relative;
      overflow:visible;
    "
  >

    <!-- FM VALIDATION -->
    <div
      class="validation-segment fm-validation"
      title="FM Validation: ${fmTime.toFixed(2)}s"
      style="
        width:${fmPercent.toFixed(6)}%;
        height:100%;
        background:#f59e0b;
        position:relative;
        flex-shrink:0;
        overflow:visible;
        box-sizing:border-box;
        z-index:3;
      "
    >
      <span
        class="fm-validation-label"
        style="
          position:absolute;
          left:4px;
          top:50%;
          transform:translateY(-50%);
          display:block;
          color:#ffffff;
          font-size:13px;
          font-weight:600;
          line-height:1;
          white-space:nowrap;
          overflow:visible;
          text-overflow:clip;
          z-index:20;
          pointer-events:none;
          text-shadow:
            0 1px 2px rgba(0,0,0,0.65),
            0 0 2px rgba(0,0,0,0.35);
        "
      >FM Validation ${fmTime.toFixed(2)}s</span>
    </div>

    <!-- IBOL VALIDATION -->
    <div
      class="validation-segment ibol-validation"
      title="IBOL Validation: ${ibolTime.toFixed(2)}s"
      style="
        width:${ibolPercent.toFixed(6)}%;
        height:100%;
        background:#2563eb;
        position:relative;
        flex-shrink:0;
        overflow:visible;
        box-sizing:border-box;
        z-index:1;
      "
    >
      <span
        class="ibol-validation-label"
        style="
          position:absolute;
          left:50%;
          top:50%;
          transform:translate(-50%,-50%);
          display:block;
          color:#ffffff;
          font-size:13px;
          font-weight:600;
          line-height:1;
          white-space:nowrap;
          overflow:visible;
          text-overflow:clip;
          z-index:10;
          pointer-events:none;
          text-shadow:
            0 1px 2px rgba(0,0,0,0.35);
        "
      >IBOL Validation ${ibolTime.toFixed(2)}s</span>
    </div>

    <!-- FILE VALIDATION CAPTION UNDER YELLOW AND BLUE BAR -->
    <div class="validation-split-caption">
      <strong>File Validation</strong>
      <span>(Upload to Pending Initiation)</span>
    </div>

  </div>
</div>`;

// ------------------------------------------------------------
// Replace ONLY the File Validation bar
// ------------------------------------------------------------

html = html.replace(
    originalBar,
    newBar
);

// ------------------------------------------------------------
// Additional CSS protection
//
// The report already contains .lt-bar overflow:hidden.
//
// Because stylesheet rules could override inherited behaviour,
// this targets ONLY the split validation bar.
//
// Other bars are untouched.
// ------------------------------------------------------------

const splitValidationCss = `
<style id="validation-split-style">

.lt-bar.lt-validation:has(.validation-split-wrapper) {
    overflow: visible !important;
}

.validation-split-wrapper {
    overflow: visible !important;
}

.validation-split-wrapper .fm-validation {
    overflow: visible !important;
}

.validation-split-wrapper .fm-validation-label {
    overflow: visible !important;
    white-space: nowrap !important;
    text-overflow: clip !important;
}

.validation-split-wrapper .ibol-validation-label {
    white-space: nowrap !important;
}

/*
 * Caption displayed underneath the FM and IBOL
 * File Validation graph.
 */
.validation-split-caption {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    text-align: center;
    font-family: inherit;
    line-height: 1.2;
    box-sizing: border-box;
    pointer-events: none;
    z-index: 30;
}

.validation-split-caption strong {
    display: block;
    color: #111827;
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
}

.validation-split-caption span {
    display: block;
    margin-top: 1px;
    color: #475569;
    font-size: 12px;
    font-weight: 400;
    white-space: nowrap;
}

</style>
`;

if (html.includes("</head>")) {

    html = html.replace(
        "</head>",
        `${splitValidationCss}\n</head>`
    );

} else {

    html =
        splitValidationCss +
        "\n" +
        html;
}

// ------------------------------------------------------------
// Generate output file
//
// Original HTML is NOT overwritten.
// ------------------------------------------------------------

const parsed =
    path.parse(resolvedInputFile);

const outputFile =
    path.join(
        parsed.dir,
        `${parsed.name}-validation-split${parsed.ext}`
    );

fs.writeFileSync(
    outputFile,
    html,
    "utf8"
);

// ------------------------------------------------------------
// Console result
// ------------------------------------------------------------

console.log("");
console.log(
    "Validation bar updated successfully."
);
console.log(
    "------------------------------------"
);

console.log(
    `File Validation : ${totalValidation.toFixed(2)}s`
);

console.log(
    `FM Validation   : ${fmTime.toFixed(2)}s`
);

console.log(
    `IBOL Validation : ${ibolTime.toFixed(2)}s`
);

console.log("");

console.log(
    `FM percentage   : ${fmPercent.toFixed(2)}%`
);

console.log(
    `IBOL percentage : ${ibolPercent.toFixed(2)}%`
);

console.log("");

console.log(
    `Original file   : ${resolvedInputFile}`
);

console.log(
    `Output file     : ${outputFile}`
);

console.log("");

console.log(
    "NOTE: Original report was not overwritten."
);