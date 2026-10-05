@BatchPayments @API_Tests @getBatchFileDetails
Feature: Get Batch File Details

    # Chain flow for each scenario:
    # Upload -> Get Files -> Store fileId -> Get File Batches -> Store trxId -> Get Batch File Details
    @getFileBatchDetails1
    Scenario Outline: Validate Get Batch File Details positive business scenarios without query parameters
        When I update the Azure test case ID "<tcId>"
        And I hit the API to upload a "batch-payment-file" with API Registry "Payments-API\\Batch-Payments\\mockUploadBatchFileAPIREG" Object Name "mockUploadBatchFile" using upload template "SINGLE_BATCH_DETAILS_STANDARD"
        And I hit the GET API to fetch files with API Registry "Payments-API\\Batch-Payments\\getFilesAPIREG" Object Name "getFiles" without query parameters
        Then I verify the Status Code is 200 for the records
        And I robustly store fileId from get files response for uploaded batch
        And I poll get files status for uploaded batch to reach one of "PENDINIT" with max retries 10 and wait ms 1500
        And I hit the GET API to fetch file batches with API Registry "Payments-API\\Batch-Payments\\getFileBatchesAPIReg" Object Name "getFileBatches" for fileId "DYNAMIC_FILE_ID" and auth mode "withAuth" without query parameters
        Then I verify the Status Code is 200 for the records
        And I poll get file batches until batch status code "PENDINIT" is available at index <batchIndex> with max retries 8 and wait ms 1200
        And I store batch transaction context from get file batches response at index <batchIndex>
        When I hit the GET API to fetch batch file details with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" and trxId "<trxId>" and auth mode "<authMode>"
        Then I verify the Status Code is <expectedStatusCode> for the records
        And I verify the response schema for the records with API Registry "<regFileName>" Object Name "<regObjectName>"
        And I verify get batch file details response integrity with upload and batch context
        And I verify batch file details field expectations paymentType "<expectedPaymentType>" paymentRail "<expectedPaymentRail>" statusCode "<expectedBatchStatus>" shiftValueDate "<expectedShiftValueDate>" canApproveOrReject "<expectedCanApproveOrReject>" canDelete "<expectedCanDelete>"
        And I verify transaction id format in batch file details response is "alphanumeric"
        And I verify debit account fields are populated in batch file details response
        Examples:
            | tcId | regFileName                                             | regObjectName       | fileId          | trxId           | authMode | expectedStatusCode | batchIndex | expectedPaymentType | expectedPaymentRail | expectedBatchStatus | expectedShiftValueDate | expectedCanApproveOrReject | expectedCanDelete |
            |      | Payments-API\\Batch-Payments\\getBatchFileDetailsAPIReg | getBatchFileDetails | DYNAMIC_FILE_ID | SELECTED_TRX_ID | withAuth | 200                | 1          | EFT                 | EFT                 | PENDINIT            | false                  | true                       | true              |
    #|

    Scenario Outline: Validate Get Batch File Details negative scenarios without query parameters
        When I update the Azure test case ID "<tcId>"
        And I hit the API to upload a "batch-payment-file" with API Registry "Payments-API\\Batch-Payments\\mockUploadBatchFileAPIREG" Object Name "mockUploadBatchFile" using upload template "SINGLE_BATCH_DETAILS_STANDARD"
        And I hit the GET API to fetch files with API Registry "Payments-API\\Batch-Payments\\getFilesAPIREG" Object Name "getFiles" without query parameters
        Then I verify the Status Code is 200 for the records
        And I robustly store fileId from get files response for uploaded batch
        And I poll get files status for uploaded batch to reach one of "PENDINIT" with max retries 10 and wait ms 1500
        And I hit the GET API to fetch file batches with API Registry "Payments-API\\Batch-Payments\\getFileBatchesAPIReg" Object Name "getFileBatches" for fileId "DYNAMIC_FILE_ID" and auth mode "withAuth" without query parameters
        Then I verify the Status Code is 200 for the records
        And I poll get file batches until batch status code "PENDINIT" is available at index 1 with max retries 8 and wait ms 1200
        And I store batch transaction context from get file batches response at index 1
        When I hit the GET API to fetch batch file details with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" and trxId "<trxId>" and auth mode "<authMode>"
        Then I verify response status code is one of for batch file details "<allowedStatusCodes>"
        And I verify batch file details error contains "<expectedErrorContains>"
        Examples:
            | tcId | regFileName                                             | regObjectName       | fileId          | trxId           | authMode    | allowedStatusCodes | expectedErrorContains |
            |      | Payments-API\\Batch-Payments\\getBatchFileDetailsAPIReg | getBatchFileDetails | INVALID_FILE_ID | SELECTED_TRX_ID | withAuth    | 404                | file                  |
            |      | Payments-API\\Batch-Payments\\getBatchFileDetailsAPIReg | getBatchFileDetails | DYNAMIC_FILE_ID | INVALID_TRX_ID  | withAuth    | 404                | transaction           |
            |      | Payments-API\\Batch-Payments\\getBatchFileDetailsAPIReg | getBatchFileDetails | EMPTY           | SELECTED_TRX_ID | withAuth    | 400,404            | bad request           |
            |      | Payments-API\\Batch-Payments\\getBatchFileDetailsAPIReg | getBatchFileDetails | DYNAMIC_FILE_ID | EMPTY           | withAuth    | 400,404            | bad request           |
            |      | Payments-API\\Batch-Payments\\getBatchFileDetailsAPIReg | getBatchFileDetails | DYNAMIC_FILE_ID | SELECTED_TRX_ID | withoutAuth | 401,403            | forbidden             |

    @RejectedFile
    Scenario: Validate rejected file does not return in get file batches response
        When I update the Azure test case ID ""
        And I hit the API to upload a "batch-payment-file" with API Registry "Payments-API\\Batch-Payments\\mockUploadBatchFileAPIREG" Object Name "mockUploadBatchFile" using upload template "SINGLE_BATCH_DETAILS_REJECTED"
        And I hit the GET API to fetch files with API Registry "Payments-API\\Batch-Payments\\getFilesAPIREG" Object Name "getFiles" without query parameters
        Then I verify the Status Code is 200 for the records
        And I robustly store fileId from get files response for uploaded batch
        And I poll get files status for uploaded batch to reach one of "REJECTED,FAILED" with max retries 10 and wait ms 1500
        And I hit the GET API to fetch file batches with API Registry "Payments-API\\Batch-Payments\\getFileBatchesAPIReg" Object Name "getFileBatches" for fileId "DYNAMIC_FILE_ID" and auth mode "withAuth" without query parameters
        Then I verify the response status code is one of "400,404"

    @QueryParams
    Scenario Outline: Validate get file batches query parameters in dedicated scenarios
        When I update the Azure test case ID "<tcId>"
        And I hit the API to upload a "batch-payment-file" with API Registry "Payments-API\\Batch-Payments\\mockUploadBatchFileAPIREG" Object Name "mockUploadBatchFile" using upload template "SINGLE_BATCH_DETAILS_STANDARD"
        And I hit the GET API to fetch files with API Registry "Payments-API\\Batch-Payments\\getFilesAPIREG" Object Name "getFiles" with query parameters page "1" size "20" search "" sort "" filter "" fromDate "" toDate ""
        Then I verify the Status Code is 200 for the records
        And I robustly store fileId from get files response for uploaded batch
        And I poll get files status for uploaded batch to reach one of "PENDINIT" with max retries 10 and wait ms 1500
        And I hit the GET API to fetch file batches with API Registry "Payments-API\\Batch-Payments\\getFileBatchesAPIReg" Object Name "getFileBatches" for fileId "DYNAMIC_FILE_ID" with query parameters page "<page>" size "<size>" search "" sort "amount" sortDirection "<sortDirection>" filter "" and auth mode "withAuth"
        Then I verify the Status Code is 200 for the records
        And I verify the response items are sorted by amount in "<sortOrder>" order using jpath key "dataAmount" from API Registry "Payments-API\\Batch-Payments\\getFileBatchesAPIReg" and Object Name "getFileBatches"
        Examples:
            | tcId | page | size | sortDirection | sortOrder  |
            |      | 1    | 20   | asce          | ascending  |
            |      | 1    | 20   | dsce          | descending |
