export enum Keys {
  GITHUB_ACCESS_TOKEN = "GITHUB_ACCESS_TOKEN",
}

export const get = (key: string) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (results) => {
      if (results[key]) {
        resolve(results[key]);
      } else {
        reject(new Error(`key ${key} not found.`));
      }
    });
  });
};

export const set = (key: string, value: string) => {
  chrome.storage.local.set(
    {
      [key]: value,
    },
    () => {}
  );
};

export const remove = (key: string) => {
  chrome.storage.local.remove(key, () => {});
};
