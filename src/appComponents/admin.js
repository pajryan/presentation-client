'use strict';

const path = require('path');
const fs = require('fs');
const unzipper = require('unzipper')

const utils = require ('./adminUtils.ts');
// const msg = require ('./../messages.js');


export function buildApp(){
  let _rootElem,    // root html element that the entire admin UI will be appended to
      _toc,         // like this admin obj, the toc obj.  Creating a reference here will allow toc functions to run from admin (and vice versa)
      _slideshow,   // like this admin obj, the slideshow obj.  Creating a reference here will allow slideshow functions to run from admin (and vice versa
      _state;       // global state object
    
  let autoUpdater,
      appConfigPath,
      appDataPath,
      appDataArchivePath,
      appPresentationPath,
      appImagePath,
      appPresentationConfig,
      dataToUpdate = [], unpublishedImageObj = [], missingImages = [],
      adminVue,
      isShown = false;

  let isFirstTimeUser = false;  //if this goes true, the user will be launched directly to admin configuration


  function admin(){
    let p = document.createElement('p');
    _rootElem.appendChild(p);

    appConfigPath = path.join(_state.appPath, _state.appConfigFileName);
    appDataPath = path.join(_state.appPath, _state.appDataStorePath);
    appDataArchivePath = path.join(_state.appPath, _state.appDataArchivePath);
    appPresentationPath = path.join(_state.appPath, _state.appPresentationPath);
    appImagePath = path.join(_state.appPath, _state.appImagePath);
    appPresentationConfig = path.join(appPresentationPath, _state.appPresentationConfigFileName)

    //if needed, build the user storage directories, configs etc (on first time running the app)
    isFirstTimeUser = admin.initAppDirectories();
    if(!isFirstTimeUser){
      // these items are configured by the user. So get them if we have them. A first time user will be prompted
      let config = JSON.parse(fs.readFileSync(appConfigPath))
      _state.dataUpdateServiceURL = config.dataUrl;
      _state.userName = config.userName;
      _state.userEmail = config.email;
      _state.apiKey = config.apiKey;
      _state.adminPassword = config.adminPassword;
      _state.isAdmin = _state.adminPassword === _state.validAdminPassword;
    }

  }
  



  admin.getUUID = function(){
    return utils.getUUID();
  }

  admin.closeAdmin = function(){
    //runs when the admin is hidden
    _toc.adminClosed();
    _slideshow.adminClosed();
    isShown = false;
  }


  // the first time a user launches the application we need the following in the user storage (e.g. /Users/<user>/Library/Application Support/<appName>/:
  //  a default configuration file
  //  a _data directory
  //  a _presentations directory
  admin.initAppDirectories = function(){
    // get the config. If the config doesn't exist, we treat this as an initialization state!
    if(!fs.existsSync(appConfigPath)){
      console.log("-----------")
      console.log("THIS IS A NEW INSTALL! Creating config files and directories in the user storage")
      console.log("-----------")
      const defaultAppConfig = require('@/configuration/defaultAppConfig.json');
      const defaultPresentationFlow = require('@/configuration/defaultPresentationFlow.json');  //_state.appDefaultPresentationFileName
      const defaultPresentationConfig = require('@/configuration/defaultPresentationConfig.json'); 
      fs.writeFileSync(appConfigPath, JSON.stringify(defaultAppConfig, null, '\t'), 'utf8');
  
      //write the _data directory
      if(!fs.existsSync(appDataPath)){
        fs.mkdirSync(appDataPath)
      }
      //write the _archive directory
      if(!fs.existsSync(appDataArchivePath)){
        fs.mkdirSync(appDataArchivePath)
      }
      //write the _presentation directory
      if(!fs.existsSync(appPresentationPath)){
        fs.mkdirSync(appPresentationPath);
        //write the default presentation flow
        let appDefaultPresentationFile = path.join(appPresentationPath, defaultPresentationFlow.metadata.id+".json"); //name the default file based on its UUID
        fs.writeFileSync(appDefaultPresentationFile, JSON.stringify(defaultPresentationFlow, null, '\t'), 'utf8');
        //write the default presentation config
        fs.writeFileSync(appPresentationConfig, JSON.stringify(defaultPresentationConfig, null, '\t'), 'utf8');
      }

      //write the _images directory
      if(!fs.existsSync(appImagePath)){
        fs.mkdirSync(appImagePath);
      }

      return true;
    }
    return false;
  }

  // this is called from the config tab of the admin view - to update the config with api key, user name etc
  admin.writeConfigFileDetails = function(configData){  // { name:<name>, email:<email>, dataUrl:<dataUrl>, apiKey:<apiKey>  }
    //update local state
    _state.dataUpdateServiceURL = configData.dataUrl;
    _state.apiKey = configData.apiKey;
    _state.userName = configData.name;
    _state.userEmail = configData.email;
    _state.adminPassword = configData.adminPassword;

    // set the admin state
    _state.isAdmin = _state.adminPassword === _state.validAdminPassword;

    //update user stored config file
    let config = JSON.parse(fs.readFileSync(appConfigPath));
    config.userName = configData.name;
    config.email = configData.email;
    config.dataUrl = configData.dataUrl;
    config.apiKey = configData.apiKey;
    config.adminPassword = configData.adminPassword;
    fs.writeFileSync(appConfigPath, JSON.stringify(config, null, '\t'), 'utf8');
  }

  admin.checkForDataServer = function(callback){
    utils.checkOnlineAndDataConnectionAndApiKey(_state.dataUpdateServiceURL, _state.apiKey, (online, err) => {
      if(online){
        callback({status:200});
      }else{
        console.error('could not connect to data provider', err)
        callback(null, {error:err});
      }
    })
  }

  /*
    PRESENTATION MANAGEMENT ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    For presentations, there are two sources:
      - the online web-update service (same service as data update, just different endpoints)
      - the local user storage.  When displaying existing presentations, this is where we pull from
  */
  admin.getPresentations = function(){
    //get a list of all presentations available
    let presentations = []; 
    fs.readdirSync(appPresentationPath).forEach(file => {
      if(file != _state.appPresentationConfigFileName && file != '.DS_Store' && file.indexOf('deleted_') == -1){ //skip the config file! and skip deleted files!
        presentations.push(JSON.parse(fs.readFileSync(path.join(appPresentationPath, file))));
      }
    });
    return presentations;
  }

  admin.getArchivedPresentations = function(){
    let presentations = []; 
    fs.readdirSync(appPresentationPath).forEach(file => {
      if(file.indexOf('deleted_') != -1){ // only included the "deleted_<id>.json" files
        presentations.push(JSON.parse(fs.readFileSync(path.join(appPresentationPath, file))));
      }
    });
    presentations = presentations.sort((a,b) => b.metadata.creationDate - a.metadata.creationDate)
    return presentations;
  }

  admin.getActivePresentationId = function(){
    let presentationConfig = JSON.parse(fs.readFileSync(appPresentationConfig));
    return presentationConfig.activePresentation;
  }

  admin.getActivePresentation = function(){
    let activePresentationId = admin.getActivePresentationId();
    return JSON.parse(fs.readFileSync(path.join(appPresentationPath, activePresentationId+'.json')));
  }

  admin.getActivePresentationItemOfType = function(type='component'){
    // can look for 'component', 'mmdText', or 'image
    let sections = this.getActivePresentation().presentation.sections;
    let pages = sections.reduce((acc,s) => acc.concat(s.pages),[]);
    let pageItems = pages.reduce((acc, p) => acc.concat(p.pageItems), []);
    let pageItemTypes = pageItems.map(pi => pi.type);
    let chosenPageType = pageItemTypes.filter(pit => pit[type]);
    return chosenPageType;
  }

  admin.setActivePresentation = function(id){
    let presentationConfig = JSON.parse(fs.readFileSync(appPresentationConfig));
    presentationConfig.activePresentation = id;
    fs.writeFileSync(appPresentationConfig, JSON.stringify(presentationConfig, null, '\t'), 'utf8');
    _state.activePresentation = this.getActivePresentation();
  }

  admin.getPresentationById = function(id){
    return JSON.parse(fs.readFileSync(path.join(appPresentationPath, id + ".json")));
  }

  admin.duplicatePresentation = function(id){
    let newPresentation = admin.getPresentationById(id);
    let newPresentationId = utils.getUUID();
    newPresentation.metadata.title += " (COPY)";
    newPresentation.metadata.id = newPresentationId;
    newPresentation.metadata.isPublished = false;
    newPresentation.metadata.version = 0;
    newPresentation.metadata.creationDate = new Date().getTime();
    admin.writePresentation(newPresentation);
    return newPresentation;
  }

  admin.writePresentation = function(presentationObject){
    let fileName = presentationObject.metadata.id;
    fs.writeFileSync(path.join(appPresentationPath, fileName + ".json"), JSON.stringify(presentationObject, null, '\t'), 'utf8');
  }

  admin.archivePresentation = function(id){ //prepend file with "deleted_"
    let currName = path.join(appPresentationPath, id+".json");
    let newName = path.join(appPresentationPath, "deleted_"+id+".json")
    fs.renameSync(currName, newName)
  }
  
  admin.unarchivePresentation = function(id){ //remove prepended "deleted_"
    let currName = path.join(appPresentationPath, "deleted_"+id+".json");
    let newName = path.join(appPresentationPath, id+".json")
    fs.renameSync(currName, newName)
  }

  admin.deletePresentation = function(id){  // fully delete from the file system.  Note that this can receive "deleted_<id>" (not just id).  So dont' use this ID for other calls!!!
    fs.unlinkSync(path.join(appPresentationPath, id + ".json")); //this just deletes
  }

  admin.publishPresentation = function(id, callback){
    utils.checkOnlineAndDataConnectionAndApiKey(_state.dataUpdateServiceURL, _state.apiKey, (online, err) => {
      if(online){

        let presentationToPublish = admin.getPresentationById(id);
        //push the presentation to the server
        utils.publishPresentation(_state.dataUpdateServiceURL, _state.apiKey, '/savePresentation', presentationToPublish, (data, err) => {
          //now, need to go thru the presentation and see if it includes any images not already published to the server
          if(!err && data && data.status == 200){
            utils.getImagesList(_state.dataUpdateServiceURL, _state.apiKey, (data2, err2) => {
              if(!err2 && data2 && data2.status == 200){
                let publishedImages = data2.images; // array of <uuid>.png
                // determine what images are in the presentation
                let pres = this.getPresentationById(id);
                let presImages = utils.extractKeyValueFromObject(pres, 'image');
                // see if any of the presentation images are NOT published
                let unpublishedImages = presImages.filter(pi => (publishedImages.findIndex(pub => pub===pi) == -1));
                // console.log('unpublished images: ', unpublishedImages)
                if(unpublishedImages.length == 0){
                  callback(data, err);    // no images to publish, return
                }else{
                  //need to publish images
                  unpublishedImageObj = unpublishedImages.map(upi => {return {image: upi, attempted: false, complete: false, msg:''}});
                  unpublishedImageObj.forEach(upi => {
                    utils.publishImage(_state.dataUpdateServiceURL, _state.apiKey, path.join(admin.getAppImagePath(), upi.image), upi.image, (data, error) => {
                      if(error){
                        console.error('error publishing image to server ', error);
                        upi.attempted = true;
                        up.msg = error;
                        admin.publishPresentationImageStatus(callback)
                      }else{
                        upi.attempted = true;
                        upi.complete = true;
                        admin.publishPresentationImageStatus(callback);
                      }
                    })
                  })
                }

              }else{
                callback(data, err)    
              }
            });
          }else{
            callback(data, err)
          }
        });
      }else{
        console.error('could not connect to data provider', err)
        callback(null, {error:err});
      }
    });
  }

  admin.publishPresentationImageStatus = function(callback){
    let attempted = unpublishedImageObj.filter(d => d.attempted);
    let percentAttempted = 100 * attempted.length / unpublishedImageObj.length;

    if(percentAttempted === 100){
      let incomplete = unpublishedImageObj.filter(d => !d.complete);
      if(incomplete.length === 0){
        callback({status: 200});
      }else{
        callback(null, {status:400, error: incomplete});
      }
    }
  }

  admin.markLocalPresentationAsPublished = function(id){
    let pres = admin.getPresentationById(id);
    pres.metadata.isPublished = true;
    admin.writePresentation(pres);
  }

  admin.downloadPresentations = function(callback){
    // will download all presentations. only want presentations we dont already have, so pass an array of what we have to prevent large, unnecessary downloads
    let existingPresentations = admin.getArchivedPresentations().concat(admin.getPresentations());
    let existingPresentationNames = existingPresentations.map(p => p.metadata.id);
    
    //make sure we're online and connected to data
    utils.checkOnlineAndDataConnectionAndApiKey(_state.dataUpdateServiceURL, _state.apiKey, (online, err) => {
      if(online){
        // make call to server to get presentations
        utils.getPresentations(_state.dataUpdateServiceURL, _state.apiKey, existingPresentationNames, (data, err) => {
          if(err){
            callback(null, {error:err});
          }else{
            callback({status:200, data: data});
          }
        });
      }else{
        console.error('could not connect to data provider to download presentations', err)
        callback(null, {error:err});
      }
    })
  }


  /*
    IMAGE MANAGEMENT ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  */
  admin.saveImage = function(localPath) {
    let uuid = utils.getUUID();
    let fileParts = localPath.split(".");
    let extension = "." + fileParts[fileParts.length-1];
    let filename = uuid + extension;
    fs.copyFileSync(localPath, path.join(appImagePath, filename));
    return filename;
  }


  admin.downloadPresentationImages = function(pres, callback){  //callback expecting one parameter: true/false for success
    // need to determine first if any of the imags required for this presentation are "new" for the user
    let presentationImages = utils.extractKeyValueFromObject(pres, 'image');
    console.log('presentation images', presentationImages)
    //get list of presentations we already have
    let existingImages = utils.listImagesInLocalStore(this.getAppImagePath());
    console.log('existing images', existingImages)

    missingImages = presentationImages.filter(pi => (existingImages.findIndex(pub => pub===pi) == -1));
    console.log('missing images', missingImages)

    if(missingImages.length ==0){
      callback({status: 200});
    }else{
      //need to get images
      missingImages = presentationImages.map(d => {return {image: d, attempted: false, complete: false, msg:''}}); // add some metadata
      missingImages.forEach(mi => {
        let downloadToPath = path.join(this.getAppImagePath(), mi.image)
        utils.downloadImage(_state.dataUpdateServiceURL, _state.apiKey, mi.image, downloadToPath, (data, error) => {
          if(error){
            mi.attempted = true;
            mi.msg = error;
            admin.downloadPresentationImagesStatus(callback)
          }else{
            mi.attempted = true;
            mi.complete = true;
            admin.downloadPresentationImagesStatus(callback)
          }
        })
      })
      

      
    }
  }


  admin.downloadPresentationImagesStatus = function(callback){
    let attempted = missingImages.filter(d => d.attempted);
    let percentAttempted = 100 * attempted.length / missingImages.length;
    if(percentAttempted == 100){
      let incomplete = missingImages.filter(d => !d.complete);
      if(incomplete.length === 0){
        callback({status: 200});
      }else{
        callback(null, {status:400, error: incomplete});
      }
    }
  }



  /*
    DATA UPDATE ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  */
  admin.checkForDataUpdates = function(callback, dataAfterDate) {
    return utils.checkIfOnline((isOnline) => {
      if(!isOnline){
        callback({isOnline:false, dataAvailable:null, message: msg.msg('no-internet-connection')})
        return;
      }
      return utils.checkIfHaveDataConnection(_state.dataUpdateServiceURL, (hasDataConnection) => {
        if(!hasDataConnection){
          callback({isOnline:false, dataAvailable:null, message: msg.msg('no-data-service-conection')})
          return;
        }
        
        // get the date this was last updated
        console.log("checking last update at ", appConfigPath);
        let appConfig = JSON.parse(fs.readFileSync(appConfigPath)); //get the last data update from the config
        let lastAppDataUpdate = appConfig.lastDataUpdate;

        //if a date was passed, we're forcing a data update after the given date
        if(dataAfterDate){lastAppDataUpdate = dataAfterDate.getTime();}

        // now get the data log from the data update service.  The data log is a large object that looks like { dataLog: [timestamp:<timeInMS>, file:<fileName>, timestamp:<timeInMS>, file:<fileName>, ....]}
        //   The <timestamp> is when the source data (<fileName>) was created.  So any timestamps greater than the last udpate time in the config is NEW
        utils.dataServiceCall(_state.dataUpdateServiceURL, _state.apiKey, '/dataLog', (data, err) => {
          if(err){
            console.error("error calling the data update service: ", err)
            callback({isOnline: true, dataAvailable: false, messsage:{text:'error: ' + JSON.stringify(err)}});
            return;
          }
          dataToUpdate = data.dataLog.filter(d => {return d.timeStamp >= lastAppDataUpdate});
          if(lastAppDataUpdate==null){  //new user, or data has been deleted
            callback({isOnline:true, dataAvailable: true, message: msg.msg('first-time-fetching-data')});
          }else{  //just a normal update
            callback({isOnline:true, dataAvailable: dataToUpdate.length > 0});
          }
        })
      });
    });
    
  }


  admin.getUpdatedData = function(progressCallback, completeCallback){
    console.log('fetching new data:', dataToUpdate);
    // the following will work, but will need to setInterval or something gross to know when it's done. really need promises here
    dataToUpdate.forEach((d,i) => { //add some metadata to track
      d.index = i; d.attempted = false; d.complete = false; d.msg = '';
    });
    dataToUpdate.forEach((d,i) => {
      //fetch the file and copy to the local directory
      let req = '/requestFile/' + d.file;
      utils.dataServiceCall(_state.dataUpdateServiceURL, _state.apiKey, req, (data, error) => {
        
        if(error) {// file not found
          console.error('error fetching file from data service ', error)
          d.attempted = true;
          d.msg = error;
          admin.getUpdatedDataStatus(progressCallback, completeCallback);
        }else{
          fs.writeFile(path.join(appDataPath,d.file), JSON.stringify(data, null, '\t'), err => {
            if(err){
              console.error('error writing file ' + d.file, err)
              d.msg = err;
              d.attempted = true;
              admin.getUpdatedDataStatus(progressCallback, completeCallback);
            }else{
              d.attempted =true;
              d.complete = true;
              admin.getUpdatedDataStatus(progressCallback, completeCallback);
            }
          });
        }
      });
    });
  }

  admin.getUpdatedDataStatus = function (progressCallback, completeCallback){
    let attempted = dataToUpdate.filter(d => d.attempted);
    let attemptedAndComplete = attempted.filter(d => d.complete);
    let attemptedAndFailed = attempted.filter(d => !d.complete);
    let percentComplete = 100 * attemptedAndComplete.length / dataToUpdate.length;
    let percentFailed = 100 * attemptedAndFailed.length / dataToUpdate.length;
    let percentAttempted = 100 * attempted.length / dataToUpdate.length;
    progressCallback(percentComplete, percentFailed, dataToUpdate.length)

    if(percentAttempted === 100){
      let incomplete = dataToUpdate.filter(d => !d.complete);
      if(incomplete.length === 0){
        completeCallback();
        admin.updateConfig("lastDataUpdate", new Date().getTime());
      }else{
        completeCallback(incomplete)
      }
    }
  }

  admin.deleteData = function(callback){
    fs.readdir(appDataPath, (err, files) => {
      if (err){callback(err); return;}
      for (const file of files) {
        fs.unlink(path.join(appDataPath, file), err => {
          if (err){callback(err); return;}
        });
      }
      callback()
    });
    //update the config to null date
    admin.updateConfig("lastDataUpdate", null)
  }

  admin.updateConfig = function(key, value){
    let appConfig = JSON.parse(fs.readFileSync(appConfigPath)); 
    appConfig[key] = value;
    fs.writeFileSync(appConfigPath, JSON.stringify(appConfig, null, '\t'))
  }


  /*
    DATA ARCHIVE ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  */
  admin.archiveLocalData = function(callback){
    // going to get everythingin the _data directory, create a .zip it, name it dataArchive-yyyy-mm-dd-hh-mm.zip and move to _archive directory
    let now = new Date();
    let archiveFilename = 'dataArchive_' + now.getFullYear() + '-' + 
                                          ((now.getMonth()+1) < 10 ? '0' + (now.getMonth()+1): (now.getMonth()+1)) + '-' + 
                                          (now.getDate() < 10 ? '0' + now.getDate(): now.getDate()) + '-' + 
                                          (now.getHours() < 10 ? '0' + now.getHours(): now.getHours()) + '-' + 
                                          (now.getMinutes() < 10 ? '0' + now.getMinutes(): now.getMinutes()) + '-' + 
                                          (now.getSeconds() < 10 ? '0' + now.getSeconds(): now.getSeconds()) + '.zip';
    console.log('creating archive file', archiveFilename)

    utils.zipDirectory(appDataPath, appDataArchivePath, archiveFilename, (err) => {
      if(err){
        console.log('error creating archive', err)
        callback(err)
      }else{
        callback();
      }
    })
  }


  admin.deployArchive = function(removeAllExistingFiles, archiveFileName, callback){
    // going to get an existing archive (.zip) and expand it into the _data directory REMOVING everything else in that directory
    if(removeAllExistingFiles){
      fs.readdir(appDataPath, (err, files) => {
        if(err){
          console.error('error cleaning _data directory', err)
          callback(err)
        }
        for (const file of files) {
          fs.unlink(path.join(appDataPath, file), err => {
            if(err){
              console.error('error deleting file from _data directory', err)
              callback(err)
            }
          });
        }
      });
    }

    //unzip the chosen archive and put the contents in the _data folder
    try{
      fs.createReadStream(path.join(appDataArchivePath, archiveFileName)).pipe(unzipper.Extract({ path: appDataPath }));
      callback();
    }catch(e){
      console.error('error unzipping archive', e)
      callback(e)
    }
    

  }


  admin.getLocalArchives = function(){
    // get a list of all the archives on the user's machine (.zip files in _dataArchive directory) 
    let archives = [];
    fs.readdirSync(appDataArchivePath).forEach(file => {
      if(file.indexOf('.zip') !== -1){
        archives.push(file);
      }
    });
    return archives;
  }


  admin.publishDataArchive = function(localDataArchiveFileName, callback){
    //make sure we're online and connected to data
    utils.checkOnlineAndDataConnectionAndApiKey(_state.dataUpdateServiceURL, _state.apiKey, (online, err) => {
      if(online){
        // make call to server to get data archives
        utils.publishDataArchive(_state.dataUpdateServiceURL, _state.apiKey, appDataArchivePath, localDataArchiveFileName, (data, err) => {
          if(err){
            callback(null, {error:err});
          }else{
            callback({status:200});
          }
        });
      }else{
        console.error('could not connect to data provider to upload data archive', err)
        callback(null, {error:err});
      }
    })
  }

  admin.downloadDataArchiveList = function(callback){
    // will download list all archives. only want archives we dont already have locally, so pass an array of what we have to prevent large, unnecessary downloads
    let existingArchives = admin.getLocalArchives();
    
    //make sure we're online and connected to data
    utils.checkOnlineAndDataConnectionAndApiKey(_state.dataUpdateServiceURL, _state.apiKey, (online, err) => {
      if(online){
        // make call to server to get data archives
        utils.getDataArchiveList(_state.dataUpdateServiceURL, _state.apiKey, existingArchives, (data, err) => {
          if(err){
            callback(null, {error:err});
          }else{
            callback({status:200, data: data});
          }
        });
      }else{
        console.error('could not connect to data provider to download list of data archives', err)
        callback(null, {error:err});
      }
    })
  }

  admin.downloadOneDataArchive = function(archiveFileName, callback){
    //make sure we're online and connected to data
    utils.checkOnlineAndDataConnectionAndApiKey(_state.dataUpdateServiceURL, _state.apiKey, (online, err) => {
      if(online){
        // make call to server to get presentations
        utils.getDataArchive(_state.dataUpdateServiceURL, _state.apiKey, archiveFileName, appDataArchivePath, (data, err) => {
          if(err){
            callback(null, {error:err});
          }else{
            callback({status:200});
          }
        });
      }else{
        console.error('could not connect to data provider to download data archive', err)
        callback(null, {error:err});
      }
    })
    
  }



  /*
    APPLICATION UPDATE ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  */
  admin.checkForApplicationUpdates = function(callback){
    // set the events
    autoUpdater.on('update-available', (info) => {
      callback('updateAvailable');
    })
    autoUpdater.on('update-not-available', (info) => {
      callback('updateNotAvailable', _state.appVersion);
    })
    autoUpdater.on('error', (err) => {
      callback('error', err);
    })
    autoUpdater.on('download-progress', (progressObj) => {
      callback('downloadProgress', progressObj);
    })
    autoUpdater.on('update-downloaded', (info) => {
      console.log("update downloaded")
      callback('updateDownloaded');
    });

    // call for updates
    console.log("checking for app update. current version: ", _state.appVersion)
    autoUpdater.checkForUpdatesAndNotify();
  }



  /*
    GETTERS / SETTERS ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  */

  // root element
  admin.rootElem = function(val){
    if (!arguments.length) { return _rootElem; }
    _rootElem = val;
    return admin;
  }

  // state and other parts of the app
  admin.state = function(val) {
    if (!arguments.length) { return _state; }
    _state = val;
    return admin;
  };
  admin.slideshow = function(val) {
    if (!arguments.length) { return _slideshow; }
    _slideshow = val;
    return admin;
  };
  admin.toc = function(val) {
    if (!arguments.length) { return _toc; }
    _toc = val;
    return admin;
  };
  // autoUpdater
  admin.autoUpdater = function(val) {
    if (!arguments.length) { return autoUpdater; }
    autoUpdater = val;
    return admin;
  }
  //is first time user
  admin.firstTimeUser = function(val) {
    if (!arguments.length) { return isFirstTimeUser; }
    isFirstTimeUser = val;
    return admin;
  }

  admin.adminVue = function(){
    return adminVue;
  }

  admin.getAppDataPath = function(){
    return appDataPath;
  }

  admin.getAppImagePath = function(){
    return appImagePath;
  }

  admin.isShown = function(val){
    if (!arguments.length) { return isShown; }
    isShown = val;
    return admin;
  }

  admin.isAdminUser = function(){
    return _state.isAdmin;
  }

  
  


  

  return admin;
  
}

