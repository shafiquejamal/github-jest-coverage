import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import * as store from "./store";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

const Popup = () => {
  const [accessToken, setAccessToken] = useState("");
  const [inputType, setInputType] = useState("password");

  useEffect(() => {
    store
      .get(store.Keys.GITHUB_ACCESS_TOKEN)
      .then((v) => {
        setAccessToken(v as string);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  const save = (reload: boolean) => {
    console.log("set", accessToken);
    store.set(store.Keys.GITHUB_ACCESS_TOKEN, accessToken);
    if (reload) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        tabs[0].id && chrome.tabs.reload(tabs[0].id);
      });
    }
    window.close();
  };

  return (
    <div style={{ minWidth: "700px", padding: 10 }}>
      <div>
        <input
          type={inputType}
          value={accessToken}
          placeholder="Github Access Token"
          onChange={(e) => setAccessToken(e.target.value)}
        />
        &nbsp;&nbsp;
        <FontAwesomeIcon
          onClick={() => {
            if (inputType === "password") {
              setInputType("text");
            } else {
              setInputType("password");
            }
          }}
          icon={inputType == "password" ? faEye : faEyeSlash}
          size="lg"
        />
      </div>

      <button onClick={() => save(false)} style={{ marginRight: "5px" }}>
        save
      </button>
      <button onClick={() => save(true)} style={{ marginRight: "5px" }}>
        save and reload
      </button>
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById("root")
);
