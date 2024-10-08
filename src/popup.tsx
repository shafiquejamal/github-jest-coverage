import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { UiMode } from "./coverage";
import * as store from './store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

const Popup = () => {

  const [accessToken, setAccessToken] = useState("");
  const [uiMode, setUiMode] = useState(UiMode.Border);
  const [inputType, setInputType] = useState("password")

  useEffect(() => {
    store.get(store.Keys.GITHUB_ACCESS_TOKEN).then((v) => {
      setAccessToken(v as string);
    }).catch((err) => {
      console.log(err);
    })
    store.get(store.Keys.UI_MODE).then((v) => {
      setUiMode(v as UiMode);
    }).catch((err) => {
      console.log(err);
    })
  }, []);

  const save = (reload: boolean) => {
    console.log("set", accessToken);
    store.set(store.Keys.GITHUB_ACCESS_TOKEN, accessToken);
    store.set(store.Keys.UI_MODE, uiMode);
    if (reload) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        tabs[0].id && chrome.tabs.reload(tabs[0].id)
      });
    }
    window.close();
  }
  
  return (
    <div style={{ minWidth: "700px", padding: 10 }}>
      <div>
       <input type={inputType} value={accessToken} placeholder="Github Access Token" onChange={(e) => setAccessToken(e.target.value)} />
       &nbsp;&nbsp;
       <FontAwesomeIcon onClick={() => {
          if (inputType === "password") {
            setInputType("text")
          } else {
            setInputType("password")
          }
       }} icon={inputType == "password" ? faEye: faEyeSlash } size="lg"/>
      </div>
      
      <div style={{marginTop: 10, marginBottom: 10}}>
      <select value={uiMode} onChange={(v) => setUiMode(v.target.value as UiMode)}>
        <option value={UiMode.Border}>Border</option>
        <option value={UiMode.Inline}>Inline</option>
      </select>
      </div>
      
      <button
        onClick={() => save(false)}
        style={{ marginRight: "5px" }}
      >
        save
      </button>
      <button
        onClick={() => save(true)}
        style={{ marginRight: "5px" }}
      >
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
