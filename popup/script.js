//multiple option list
var bsId;
var tabUrl;
var openTransactionUrl;
let processId;
let transactionId = document.getElementById("input-text");
let viewXMLelement = document.getElementById("view-xml");
let openTransactionElement = document.getElementById("open-transaction");
let divloaderElement = document.getElementById("loader");
let loaderElement = divloaderElement.getElementsByTagName("span");
let getQuoteDataButton = document.getElementById("get-quote-data");
let selectElement = document.getElementById("selectProcess");
function getData(){
      chrome.tabs.query({active: true, currentWindow:true},(tabs)=>{
        
        let currentTabUrl=tabs[0].url;
        if (currentTabUrl.includes("bigmachines.com")){
          let urlArray =currentTabUrl.split("/");
          tabUrl = urlArray[2]; //stores Host Name(domain Name)
          let metaDataUrl = "https://" + tabUrl + "/rest/v14/metadata-catalog"; // Meta Data URL to get Metadat
        //console.log(metaDataUrl);
    
          async function openXml(xslUrl, subdomain) {
          await fetch(xslUrl)
            .then(response => {
              if (!response.ok) {
                throw new Error("Fetching XSL Id failed.");
              }
              response.text().then(data => {
                console.log(data);
                var toSearch = "edit_xslt.jsp?id=";
                var pos = data.indexOf(toSearch);
                var xslIdStr = data.substr(pos + toSearch.length, 50);
                var newpos = xslIdStr.indexOf('"');
                var xslId = xslIdStr.substr(0, newpos); //retrieving xslt_id using string operations from the response
                var xmlUrl =
                  "https://" +
                      subdomain +
                  "/admin/commerce/views/preview_xml.jsp?bs_id=" +
                  bsId +
                  "&xslt_id=" +
                  xslId +
                  "&view_type=document";
                viewXMLelement.href = xmlUrl; 
                divloaderElement.style.height="0px";
                for (let i = 0; i<loaderElement.length; i++){
                  loaderElement[i].style.display = "none";
                }
                // loaderElement.style.display="none"; //hiding the spinner
                viewXMLelement.target = "_blank";
                viewXMLelement.style.backgroundColor = "#4fafc4";
              });
            })
            .catch(error => {
              console.error("Problem fetching XSL ID: ", error);
            });
          }
        
          const doNetworkCall = async (tabUrl) => { //fetch Rest api Call
          let options={
            "method":"GET"
          }
          const response = await fetch(metaDataUrl,options);
          if (response.ok === false){ //checking if user login or not
            divloaderElement.style.height="0px";
            for (let i = 0; i<loaderElement.length; i++){ //hiding loader element
              loaderElement[i].style.display = "none";
            }
            
            alert("Please Login With Your Credentials");

          }
          else{
            const jsonData = await response.json(); //store Metadata as json 
            let allCommerceProcces = []; // Stores All commerce Proccesses Names
            for (let eachProcessData of jsonData.items){
              if (eachProcessData.name.includes("commerceDocuments")){ //filtering Only Commerce Processes
                allCommerceProcces.push(eachProcessData.name);
              }
            }
            console.log(allCommerceProcces);
            let destinationCommerceProcess = ""; // Destinated commerce process that user Entered Transaction Id Presents
            let commerceProcessArray=[];
            for (let eachProcessName of allCommerceProcces){  //cheking The TransactionId in each Commerce Process
              let processTransactionDataUrl = 
                'https://' +
                  tabUrl + 
                  '/rest/v14/' +
                    eachProcessName+'?q={transactionID_t:\'' + transactionId.value + '\'}';   // url for getting each transaction Data
                    //console.log(processTransactionDataUrl);
              const transactionResponse = await fetch(processTransactionDataUrl, options);
              const transactionResponseData = await transactionResponse.json();
              console.log(transactionResponseData);
              if (transactionResponse.status === 200){
                if (transactionResponseData.items.length ===1){
                let newObj=[];
                newObj.push(transactionResponseData.items[0]._process_var_name);
                newObj.push(transactionResponseData.items[0]._id);
                commerceProcessArray.push(newObj);
                
                }
              }
              
            }
            async function getCommerceProcess(){
              selectElement.addEventListener("change",async function(){
                if (selectElement.value !== ""){
                  destinationCommerceProcess=selectElement.value.split("&")[0];
                  bsId=selectElement.value.split("&")[1];
                }
                await setUrls();
              })
              
            }

            if (commerceProcessArray.length==1){
              destinationCommerceProcess=commerceProcessArray[0][0];
              bsId = commerceProcessArray[0][1];
            }
            else{
              if (commerceProcessArray.length>1){
                for (let eachObj of commerceProcessArray){
                  let optionElement = document.createElement("option");
                  optionElement.textContent = eachObj[0];
                  optionElement.value= eachObj[0]+"&"+String(eachObj[1]);
                  selectElement.appendChild(optionElement);
                  selectElement.style.display="block";
                }
              }
            }
            async function setUrls(){
              openTransactionUrl = 
                "https://" + 
                tabUrl +
                "/commerce/transaction/" + 
                destinationCommerceProcess +
                "/" + bsId; //quote URL

              openTransactionElement.href  = openTransactionUrl;//quote Url
              openTransactionElement.target ="_blank"; // opening the quote in New tab 
              openTransactionElement.style.backgroundColor = "#4fafc4"; // changing the background color after getting the url
              let commerceDocumentDataForProcessIdUrl = 
                  "https://" +
                  tabUrl +
                  "/rest/v14/commerceProcesses/"+ 
                  destinationCommerceProcess +
                    "/documents" ; // commerce document metadata url

              let commerceDocumentMetaData = await fetch(commerceDocumentDataForProcessIdUrl , options);  //api call to get commerce document metadata
              let documentMetadataResponse = await commerceDocumentMetaData.json();
              processId = documentMetadataResponse.items[0].process.id; // getting process ID from the CommerceDocument Metadata
              let xslurl = 
                  "https://" +
                  tabUrl +
                  "/admin/commerce/views/list_xslt.jsp?process_id=" +
                  processId ;  // xml document URL

              openXml(xslurl,tabUrl);
            }
            
            console.log(commerceProcessArray);
            console.log(destinationCommerceProcess);
            if (destinationCommerceProcess === "" & commerceProcessArray.length === 0){ //if the quote Id is Incorrect(it didn't present in any commerce transaction)
              divloaderElement.style.height="0px";
              for (let i = 0; i<loaderElement.length; i++){ //hiding loader element
                loaderElement[i].style.display = "none";
              }
              alert("Incorrect TransactionId"); //alerting the user as Entered incorrect TraansactionId
              transactionId.value = ""; //Clearing The input element 
            }
            else if (commerceProcessArray.length > 1){
              await getCommerceProcess();
            }
            else{
              await setUrls();
            }

              // searching for XML  

              
          }
          };
          doNetworkCall(tabUrl);
        }
        else{
          divloaderElement.style.height="0px";
          for (let i = 0; i<loaderElement.length; i++){
            loaderElement[i].style.display = "none";
          }
          alert("This Extension Doesn't Run In this Tab");
        }
        })  
}

getQuoteDataButton.addEventListener("click",function(){
  if (transactionId.value !== ""){
    divloaderElement.style.height="40px";
    for (let i = 0; i<loaderElement.length; i++){ //hiding loader element
      loaderElement[i].style.display = "block";
    }
    getData();
    }else{
      alert("Enter Quote Number");
    }
})


/*
transactionId.addEventListener("keydown",function(event){
  if (event.key === "Enter"){
    loadingElement.innerText = "Loading....Please Wait";
    getData();
  }
})

openTransactionElement.addEventListener("click",function(){
  if (transactionId.value !== ""){
    loadingElement.innerText = "Loading....Please Wait";
    getData();
    }
})

viewXMLelement.addEventListener("click",function(){
  if (transactionId !== ""){
    loadingElement.innerText = "Loading....Please Wait";
    getData();
  }
})*/

