/**
 * @author Stuart McColl
 * @date 2020
 * @description Custom class for integrating with Microsoft Azure blob storage via the Azure Storage API.
 */
global with sharing class AzureBlobStorageController {

    /**
     * @description Retrieves the CaseReference, DocumentType and FileName fields from all CustomAttachments related to given Account
     * @param uniqueId the unique identifier of an Account object
     * @return A list of CaseReference, DocumentType and FileName fields for all Custom Attachment records found matching the query
     * @example
     * List<Custom_Attachment__c> myCustomAttachments = AzureBlobStorageController.getCustomAttachments('0014K000005dm2IQAQ');
     */
    @AuraEnabled(cacheable=true)
    global static List<Custom_Attachment__c> getCustomAttachments(String uniqueId) {

        return new List<Custom_Attachment__c>([SELECT CaseReference__c, DocumentType__c, FileName__c FROM Custom_Attachment__c WHERE Account__r.Id = :uniqueId]);

    }

    /**
     * @description Retrieves a base64-encoded representation of a file from Azure blob storage
     * @param caseId the GEMS case reference which forms part of the unique file identifier
     * @param documentType the type of document which forms part of the unique file identifier
     * @param fileName the type of document which forms part of the unique file identifier
     * @return A base64-encoded representation of a file, or an error message if file not found
     * @example
     * String myFile = AzureBlobStorageController.retrieveBlobFromAzureBlobStorage('AB-12-34567', 'governing-documents', 'test.txt');
     */
    @AuraEnabled(cacheable=true)
    global static String retrieveBlobFromAzureBlobStorage(String caseId, String documentType, String fileName) {

        HttpRequest req = new HttpRequest();

        req.setMethod('GET');

        String formattedTimestamp = getFormattedTimestamp();

        req.setHeader('x-ms-date', formattedTimestamp);
        
        String sharedKey = constructSharedKey(formattedTimestamp, 'STORAGE_ACCOUNT_NAME', 'CONTAINER_NAME', caseId + '/' + documentType + '/' + fileName);

        req.setHeader('Authorization', 'SharedKey STORAGE_ACCOUNT_NAME:' + sharedKey);

        req.setEndpoint('https://STORAGE_ACCOUNT_NAME.blob.core.windows.net/CONTAINER_NAME/' + caseId + '/' + documentType + '/' + fileName);

        Http http = new Http();
        HTTPResponse response;

        response = http.send(req);

        if (response.getStatusCode() ==  200) {
            return EncodingUtil.base64Encode(response.getBodyAsBlob());
        } else {
            return 'Failed, status code was ' + response.getStatusCode();
        }
        
    }

    /**
     * @description Retrieves the current timestamp and returns it in the format expected by the Microsoft Azure Storage API
     * @return A String version of the current timestamp
     * @example
     * String currentTime = AzureBlobStorageController.getFormattedTimestamp();
     */
    private static String getFormattedTimestamp() {

        datetime currentTimestamp = datetime.now();

        return currentTimestamp.formatGMT('EEE, dd MMM yyyy HH:mm:ss z');

    }

    /**
     * @description Constructs and returns the shared key necessary to authenticate calls to the Microsoft Azure Storage API
     * @param timestamp A String version of the current timestamp in the format expected by the Microsoft Azure Storage API
     * @param storageAccountName An existing Microsoft Azure Storage Account
     * @param containerName An existing Microsoft Azure blob storage container
     * @param fileName An existing file within the specified Microsoft Azure Storage Account and blob storage container
     * @return A base64-encoded String used to authenticate with the Microsoft Azure Storage API
     * @example
     * String mySharedKey = AzureBlobStorageController.constructSharedKey('formattedTimestamp', 'myStorageAccount', 'myContainer', 'AB-12-34567/governing-documents/test.txt');
     */
    private static String constructSharedKey(String timestamp, String storageAccountName, String containerName, String fileName) {

        // Key from Microsoft Azure (TODO: Get from an environment variable)
        String key = 'ACCESS_KEY';

        // Construct the string to sign
        String strToSign = 'GET\n\n\n\nx-ms-date:' + timestamp + '\n/STORAGE_ACCOUNT_NAME/CONTAINER_NAME/' + fileName;

        Blob hmac = Crypto.generateMac(
            'HMacSHA256',
            Blob.valueOf(strToSign),
            EncodingUtil.base64Decode(key)
        );

        // Return the base64 encoded signatrue
        return EncodingUtil.base64Encode(hmac);

    }

}
