const { readdirSync, statSync,readFileSync } = require('fs');
const { join } = require('path');

const getDirectories = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

const readFiles = function(dir, filelist) {
  files = readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (statSync(join(dir,file)).isDirectory()) {
      filelist = readFiles(join(dir, file), filelist);
    }
    else {
      filelist.push(join(dir,file));
    }
  });
  return filelist;
};

function getLanguages() {
  const directoryPath = join(__dirname, "");
  return getDirectories(directoryPath);
}

function collectKeys(language) {
  const directoryPath = join(__dirname, language);
  const files = readFiles(directoryPath);
  const allKeys = [];
  files.forEach((file) => {
    const rawdata = readFileSync(file);
    const parsed = JSON.parse(rawdata);
    const filePrefix = file.split("\\").reverse()[0].slice(0, -5);

    const flattened = {};
    flatten(parsed, flattened, [filePrefix]);
    const keys = Object.keys(flattened);
    keys.forEach((key) => {
      if(allKeys.includes(key)) {
        console.error(`Duplicate key ${key} for language ${language}`);
      }
      allKeys.push(key);
    });
  });

  function flatten(toFlatten, accu, prefix) {
    if (toFlatten instanceof Object) {
      Object.keys(toFlatten).forEach((key) => {
        flatten(toFlatten[key], accu, [...prefix, key]);
      });
    } else {
      accu[prefix.join(".")] = toFlatten;
    }
  }
  return allKeys;
}

function aggregateByKeys(keysForLangList) {
  const aggregated = {};
  keysForLangList.forEach((keysForLang) => {
    const {lang, keys} = keysForLang;
    keys.forEach((key) => {
      if(!aggregated[key]) {
        aggregated[key] = [];
      }
      aggregated[key].push(lang);
    })
  });
  return aggregated;
}

function cleanValid(keys, languages) {
  return Object.keys(keys).map(key => {
    let valid = true;
    languages.forEach(language => {
      if(!keys[key].includes(language)) {
        valid = false;
      }
    });
    return {key: key, valid: !valid, languages: keys[key]};
  }).filter(entry => entry.valid).map(entry => {return {key: entry.key, languages: entry.languages}})
}

function validate() {
  console.log("reading language directories...");
  const languages = getLanguages();
  console.log("found languages: " + languages);
  console.log("collecting keys...");
  const keys = languages.map((language) => {return {lang: language, keys: collectKeys(language)}});
  console.log("finding differences...");
  const differences = aggregateByKeys(keys);
  const invalid = cleanValid(differences, languages);
  if(invalid.length) {
    console.error("found translations not present:");
    invalid.forEach(entry => {
      const notPresentIn = languages.filter(x => !entry.languages.includes(x));
      console.error(`Error: key: '${entry.key}' found in languages: '${entry.languages}' but not present in '${notPresentIn}'`)
    });
    return;
  }
  console.log("alles gut, wszystko bangla")
}

validate();