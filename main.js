import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

// Konstanten
let key;
if (localStorage.getItem("key")) {
  key = localStorage.getItem("key");
} else {
  key = prompt("Bitte gebe deinen API-Key ein: !");
  if (key.length >= 10) {
    localStorage.setItem("key", key);
  }
}

const generating = new Audio("assets/audio/generating.mp3");
const ruleBreak = new Audio("assets/audio/rule_break.mp3");
const outro = new Audio("assets/audio/outro.mp3");

const API_KEY = key;
const generationConfig = {
  temperature: 0.75,
  topK: 1,
  topP: 1,
  maxOutputTokens: 7050,
};
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];
/*
const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
  ];

*/
// DOM-Elemente
const form = document.querySelector("form");
const promptInput = document.getElementById("prompt");
const output = document.querySelector(".output");
const transcript = document.getElementById("prompt");

// Google Generative AI Setup
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
const chat = model.startChat({
  generationConfig,
  safetySettings,
  history: chatHistory,
});

// Spracherkennung konfigurieren
const speechRecognition = new webkitSpeechRecognition();
let finalTranscript = "";
speechRecognition.continuous = false;
speechRecognition.interimResults = true;
speechRecognition.lang = "de-DE";

speechRecognition.onstart = () => {
  console.log("Lausche...");
};

speechRecognition.onerror = () => {
  console.log("Fehler...");
};

speechRecognition.onresult = (event) => {
  let interimTranscript = "";

  for (let i = event.resultIndex; i < event.results.length; ++i) {
    if (event.results[i].isFinal) {
      finalTranscript += event.results[i][0].transcript;
      transcript.innerHTML = finalTranscript;
    } else {
      interimTranscript += event.results[i][0].transcript;
      transcript.innerHTML = interimTranscript;
    }
  }

  console.log("Ich höre", interimTranscript);
};

speechRecognition.onend = async () => {
  console.log("Ich habe fertig gehört");
  if (
    finalTranscript.toLowerCase() == "neu laden" ||
    finalTranscript.toLowerCase() == "neuladen"
  ) {
    await playAudio(outro);
    location.reload();
  }
  if (
    finalTranscript.toLowerCase().includes("hallo teddy") &&
    finalTranscript.length > 13
  ) {
    console.log("Fertig...");
    await playAudio(generating);
    const pos = finalTranscript.toLowerCase().indexOf("hallo teddy") + 12;
    const sending = finalTranscript.slice(pos);
    generateAnswer(sending);

    finalTranscript = "";
  } else {
    finalTranscript = "";
    speechRecognition.start();
    console.log("Weiter erkennen");
  }
};

// Ereignishandler für Formulareinsendung
form.onsubmit = async (ev) => {
  ev.preventDefault();
  let question = promptInput.value;
  promptInput.value = "";
  await generateAnswer(question);
};

async function generateAnswer(question) {
  window.speechSynthesis.cancel();

  output.textContent = "Generating...";

  try {
    const result = await chat.sendMessageStream(question);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();

      output.innerHTML += chunkText;
      tts(removeFunction(chunkText));
    }

    // Nachdem die Antwort generiert wurde, die Spracherkennung fortsetzen
    speechRecognition.start();
  } catch (error) {
    console.error("Error:", error);
    output.innerHTML += "<hr>Error occurred. Please try again.";

    // Falls ein Fehler auftritt, die Spracherkennung fortsetzen
    await playAudio(ruleBreak);
    location.reload();
  }
}

function tts(text) {
  speechRecognition.stop();
  const msg = new SpeechSynthesisUtterance();
  msg.text = text;
  speechSynthesis.getVoices().forEach(function (voice) {
    console.log(voice.name, voice.lang);
    if (voice.name == "eSpeak German") {
      console.error(voice.name);
      msg.voice = voice;
    }
  });
  msg.volume = 1;
  window.speechSynthesis.speak(msg);
}

function removeFunction(inputString) {
  return inputString.replace(/[^\w\säöüÄÖÜ,.!?]/g, "");
}
speechRecognition.start();

function playAudio(audio) {
  return new Promise((res) => {
    audio.play();
    audio.onended = res;
  });
}
