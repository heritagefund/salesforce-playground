import { LightningElement, wire, track, api } from 'lwc';
import retrieveBlobFromAzureBlobStorage from '@salesforce/apex/AzureBlobStorageController.retrieveBlobFromAzureBlobStorage';
import getCustomAttachments from '@salesforce/apex/AzureBlobStorageController.getCustomAttachments';
import getAuthDetails from '@salesforce/apex/AzureBlobStorageController.getAuthDetails';
import getFormattedTimestamp from '@salesforce/apex/AzureBlobStorageController.getFormattedTimestamp';

const columns = [
    { label: 'Gems Case Reference', fieldName: 'CaseReference__c' },
    { label: 'Document Type', fieldName: 'DocumentType__c' },
    { label: 'Filename', fieldName: 'FileName__c' },
    { label: 'Open', type: 'button', initialWidth: 150, typeAttributes: { 
            label: 'Open File', 
            name: 'OpenFile', 
            title: 'OpenFile', 
            value: 'Open File', 
            iconName: 'utility:download', 
            iconPosition: 'left', 
            disabled: false
        } 
    }
];

export default class ListCustomAttachments extends LightningElement {

    // Gets the unique identifier of the current record
    @api recordId;

    @track fileContents;

    columns = columns;

    formattedTimestamp = "";
    sharedKey = "";


    // Calls the getCustomAttachments method of the AzureBlobStorageController Apex class
    // and wires the result to the customAttachments variable (used in listCustomAttachments.html)
    @wire(getCustomAttachments, { uniqueId: '$recordId' }) customAttachments;

    /**
     * Handles row action events, of which we only trigger 'OpenFile'
     * @param event An instance of an Event
     */
    handleRowAction(event) {

        const actionName = event.detail.action.name;
        const row = event.detail.row;

        switch (actionName) {

            case 'OpenFile':

                this.startDownloadWithHTTPGetFromAzure(
                    row.CaseReference__c,
                    row.DocumentType__c,
                    row.FileName__c
                );

                break;

            default:

        }

    }

     /**
     * Click a hidden download element and downloads from Azure blob storage.
     * @param caseId GEMS Case ID
     * @param documentType Type of document
     * @param fileName Filename
     */
    async startDownloadWithHTTPGetFromAzure(caseId, documentType, fileName) {
        this.setAuthDetailsFromApex(caseId, documentType, fileName)   

        console.log('starting the download')  

        const xhr = new XMLHttpRequest();

        // Todo - Is it an issue revealing this in JS?
        const url = 'https://STORAGE_ACCOUNT_NAME.blob.core.windows.net/CONTAINER_NAME/' + caseId + '/' + documentType + '/' + fileName;
        xhr.open("GET", url);

        // Todo - remove sleep and resolve promise correctly
        await new Promise(r => setTimeout(r, 5000));

        xhr.setRequestHeader('x-ms-date', this.formattedTimestamp); 
        // Todo - Is it an issue revealing this in JS?.
        xhr.setRequestHeader('Authorization', 'SharedKey STORAGE_ACCOUNT_NAME:' + this.sharedKey);

        // Todo - blob is not suitable if the request fails.  Then we want text, so we can see the error text in the response body.  Can this be set conditionally?
        xhr.responseType = "blob";

        xhr.onload = function(event) {
            if (this.status === 200) {
                // Create a new Blob object using the 
                //response data of the onload object
                // Todo - we need to identify the correct type dynamically
                var blob = new Blob([this.response], {type: 'image/png'});
                //Create a link element, hide it, direct 
                //it towards the blob, and then 'click' it programatically
                let a = document.createElement("a");
                a.style = "display: none";
                document.body.appendChild(a);
                //Create a DOMString representing the blob 
                //and point the link element towards it
                let url = window.URL.createObjectURL(blob);
                a.href = url;
                a.download = fileName;
                //programatically click the link to trigger the download
                a.click();
                //release the reference to the file by revoking the Object URL
                window.URL.revokeObjectURL(url);
                console.log('download step complete')  
            }else{
                // Todo - look into best practice for error handling here
                console.log('it broke')
                console.log(xhr)
            }
        };

        xhr.send(); 
    };

    async setAuthDetailsFromApex(caseId, documentType, fileName) {
        this.setFormattedTimestampFromApex();
        // Todo - remove sleep and resolve promise correctly
        await new Promise(r => setTimeout(r, 1000));
        this.setSharedKeyFromApex(caseId, documentType, fileName, this.formattedTimestamp);
        // Todo - remove sleep and resolve promise correctly
        await new Promise(r => setTimeout(r, 1000));
    }

    setFormattedTimestampFromApex() {
        getFormattedTimestamp()
            .then(result => { 
                this.formattedTimestamp = result;
            });    
    }

    setSharedKeyFromApex(caseId, documentType, fileName, timestamp) {
        getAuthDetails({caseId: caseId, documentType: documentType, fileName: fileName, formattedTimestamp: timestamp})
            .then(result => { 
                this.sharedKey = result;
            });    
    }

}