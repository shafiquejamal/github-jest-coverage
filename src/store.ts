export enum Keys {
  GITHUB_ACCESS_TOKEN = "GITHUB_ACCESS_TOKEN",
}

export const get = async <T = unknown>(key: Keys): Promise<T | undefined> => {
  if (!chrome.storage?.local) {
    throw new Error("chrome.storage.local is not available");
  }

  return await new Promise<T | undefined>((resolve, reject) => {
    chrome.storage.local.get([key], (results) => {
      const error = chrome.runtime?.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(results[key] as T | undefined);
    });
  });
};

export const set = async (key: Keys, value: string): Promise<void> => {
  if (!chrome.storage?.local) {
    throw new Error("chrome.storage.local is not available");
  }

  await new Promise<void>((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      const error = chrome.runtime?.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
};

export const remove = async (key: Keys): Promise<void> => {
  if (!chrome.storage?.local) {
    throw new Error("chrome.storage.local is not available");
  }

  await new Promise<void>((resolve, reject) => {
    chrome.storage.local.remove(key, () => {
      const error = chrome.runtime?.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
};
