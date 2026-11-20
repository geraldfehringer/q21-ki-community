(() => {
  const quiz = document.querySelector("#ki-quiz");
  const facts = quiz.querySelector(".quiz-facts");
  const questions = Array.from(facts.querySelectorAll("article"), article => {
    const options = Array.from(article.querySelectorAll("li"));
    return {
      topic: article.dataset.topic,
      title: article.querySelector("h3").textContent,
      options: options.map(option => option.textContent),
      correct: options.findIndex(option => option.hasAttribute("data-answer")),
      explanation: article.querySelector("details p").textContent,
      source: article.querySelector("details a")
    };
  });

  const launch = quiz.querySelector(".quiz-launch");
  const panel = quiz.querySelector(".quiz-panel");
  const round = quiz.querySelector("#quiz-round");
  const result = quiz.querySelector(".quiz-result");
  const title = quiz.querySelector("#quiz-title");
  const lead = quiz.querySelector(".quiz-lead");
  const score = quiz.querySelector(".quiz-score");
  const defaultTitle = title.cloneNode(true);
  const defaultLead = lead.textContent;
  const questionHeading = quiz.querySelector(".quiz-question");
  const options = quiz.querySelector(".quiz-options");
  const feedback = quiz.querySelector(".quiz-feedback");
  const feedbackHeading = quiz.querySelector(".quiz-feedback-title");
  const next = quiz.querySelector(".quiz-next");
  const steps = quiz.querySelector(".quiz-steps");
  const caption = quiz.querySelector(".quiz-chart-caption");
  const stars = Array.from(quiz.querySelectorAll(".compass-point"));
  const bearing = quiz.querySelector("#quiz-bearing");
  const constellation = quiz.querySelector("#quiz-constellation");
  const review = quiz.querySelector(".quiz-review");
  const choices = [];
  let index = 0;
  let finished = false;

  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function updateCompass() {
    const coordinates = questions.map((question, station) => {
      const answered = station < choices.length;
      const right = choices[station] === question.correct;
      let state = "pending";
      if (answered) state = right ? "correct" : "missed";
      else if (station === index) state = "current";
      steps.children[station].dataset.state = state;
      const star = stars[station];
      star.dataset.state = state;
      // A full-length spoke marks a correct answer. An inner star marks a new discovery.
      const distance = answered ? (right ? 76 : 38) : 59;
      const angle = station * Math.PI * 2 / questions.length;
      const x = Math.round(Math.sin(angle) * distance);
      const y = Math.round(-Math.cos(angle) * distance);
      star.setAttribute("x", x);
      star.setAttribute("y", y);
      return [x, y].join(",");
    });
    constellation.setAttribute("points", coordinates.join(" "));
    constellation.setAttribute("stroke-dasharray", finished ? "none" : "3 4");
    bearing.setAttribute("transform", "rotate(" + (index * 90) + ")");
    bearing.setAttribute("visibility", finished ? "hidden" : "visible");
    caption.textContent = finished ? "Äußere Sterne zeigen richtige Antworten" : questions[index].topic;
  }

  function choose(answer) {
    if (choices.length !== index) return;
    const question = questions[index];
    choices.push(answer);
    const right = answer === question.correct;
    const buttons = options.querySelectorAll("button");
    for (const [position, button] of buttons.entries()) {
      button.disabled = true;
      button.classList.toggle("is-picked", position === answer);
      button.classList.toggle("is-answer", position === question.correct);
      let status = "";
      if (position === question.correct) status = right ? "Dein Treffer" : "Richtig";
      else if (position === answer) status = "Deine Wahl";
      if (status) button.append(make("span", "quiz-choice-status", status));
    }
    feedbackHeading.textContent = right ? "Richtig!" : "Hier ist die Auflösung";
    quiz.querySelector("#quiz-explanation").textContent = question.explanation;
    quiz.querySelector("#quiz-source").replaceChildren(question.source.cloneNode(true));
    next.textContent = index === questions.length - 1 ? "Mein Sternbild ansehen" : "Nächste Frage";
    feedback.hidden = false;
    updateCompass();
    feedbackHeading.focus();
  }

  function renderQuestion() {
    const question = questions[index];
    quiz.querySelector("#quiz-progress").textContent = "Frage " + (index + 1) + " von " + questions.length + " · " + question.topic;
    questionHeading.textContent = question.title;
    options.querySelectorAll("button").forEach(button => button.remove());
    question.options.forEach((text, position) => {
      const button = make("button", "quiz-option");
      button.type = "button";
      const letter = make("span", "quiz-option-mark", String.fromCharCode(65 + position));
      letter.setAttribute("aria-hidden", "true");
      button.append(letter, make("span", "", text));
      button.addEventListener("click", () => choose(position));
      options.append(button);
    });
    feedback.hidden = true;
    updateCompass();
  }

  function showResult() {
    finished = true;
    const hits = choices.reduce((sum, answer, station) => sum + Number(answer === questions[station].correct), 0);
    const missedTopics = questions.filter((question, station) => choices[station] !== question.correct)
      .map(question => "„" + question.topic + "“");
    quiz.dataset.result = "";
    round.hidden = true;
    result.hidden = false;
    launch.textContent = "Auswertung einklappen";
    title.replaceChildren(document.createTextNode("Dein "), make("em", "", "Sternbild."));
    score.textContent = hits + " von " + questions.length + " richtig";
    score.hidden = false;
    lead.textContent = missedTopics.length
      ? "Auf dem inneren Ring findest du " + new Intl.ListFormat("de").format(missedTopics) + ". Unten kannst du die Erklärung zu jedem Thema nachlesen."
      : "Jeder deiner vier Sterne steht außen. Du hast erkannt, wie KI Text erzeugt, verschiedene Medien verbindet, Quellen nutzt und Werkzeuge einsetzt.";
    review.replaceChildren();
    questions.forEach((question, station) => {
      const hit = choices[station] === question.correct;
      const item = make("li");
      item.append(make("strong", "", question.topic + (hit ? " · Gewusst" : " · Dazugelernt")));
      item.append(make("p", "", question.explanation));
      item.append(question.source.cloneNode(true));
      review.append(item);
    });
    updateCompass();
    title.focus();
  }

  next.addEventListener("click", () => {
    if (finished || choices.length !== index + 1) return;
    if (index + 1 === questions.length) {
      showResult();
    } else {
      index++;
      renderQuestion();
      questionHeading.focus();
    }
  });

  quiz.querySelector(".quiz-save").addEventListener("click", () => {
    if (!finished) return;
    // The keepsake is a standalone vector postcard, created entirely in this tab.
    const ns = "http://www.w3.org/2000/svg";
    function svgNode(tag, attributes, text) {
      const node = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
      if (text) node.textContent = text;
      return node;
    }
    const card = svgNode("svg", {viewBox: "0 0 720 550", width: 720, height: 550});
    card.append(svgNode("title", {}, "Mein KI-Kompass · " + score.textContent));
    card.append(svgNode("rect", {width: 720, height: 550, rx: 18, fill: "#18151f"}));
    card.append(svgNode("rect", {x: 14, y: 14, width: 692, height: 522, rx: 10, fill: "none", stroke: "#796785"}));
    const lettering = svgNode("g", {"font-family": "sans-serif", fill: "#e6ddee", "text-anchor": "middle"});
    lettering.append(svgNode("text", {x: 360, y: 55, "font-size": 16, "letter-spacing": 2}, "Q21 KI_HUB COMMUNITY"));
    lettering.append(svgNode("text", {x: 360, y: 104, "font-size": 40, "font-family": "Georgia,serif", "font-style": "italic"}, "Mein KI-Kompass"));
    const chart = quiz.querySelector(".compass-art").cloneNode(true);
    chart.removeAttribute("class");
    chart.removeAttribute("aria-hidden");
    chart.setAttribute("x", 100);
    chart.setAttribute("y", 119);
    chart.setAttribute("width", 520);
    chart.setAttribute("height", 290);
    chart.querySelectorAll(".compass-point").forEach(point => {
      point.setAttribute("color", point.dataset.state === "correct" ? "#d1baff" : "#ecad84");
    });
    card.append(chart);
    lettering.append(svgNode("text", {x: 360, y: 450, "font-size": 29, fill: "#f3c49d"}, score.textContent));
    lettering.append(svgNode("text", {x: 360, y: 480, "font-size": 17}, "Äußere Sterne zeigen richtige Antworten"));
    lettering.append(svgNode("text", {x: 360, y: 514, "font-size": 14, fill: "#bfb2c9"}, "KI-Wissensquiz · Hamburg-Barmbek"));
    card.append(lettering);
    const file = new Blob([new XMLSerializer().serializeToString(card)], {type: "image/svg+xml;charset=utf-8"});
    const url = URL.createObjectURL(file);
    const link = make("a");
    link.href = url;
    link.download = "Q21-KI-Kompass.svg";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  });

  launch.addEventListener("click", () => {
    const open = panel.hidden;
    panel.hidden = !open;
    launch.setAttribute("aria-expanded", String(open));
    if (finished) {
      launch.textContent = open ? "Auswertung einklappen" : "Auswertung öffnen";
      if (open) quiz.querySelector(".quiz-result h3").focus();
      return;
    }
    launch.textContent = open ? "Quiz einklappen" : "Quiz fortsetzen";
    if (!open) return;
    if (!options.querySelector("button")) renderQuestion();
    (feedback.hidden ? questionHeading : feedbackHeading).focus();
  });

  quiz.querySelector(".quiz-reset").addEventListener("click", () => {
    choices.length = 0;
    index = 0;
    finished = false;
    delete quiz.dataset.result;
    title.replaceChildren(...Array.from(defaultTitle.childNodes, node => node.cloneNode(true)));
    lead.textContent = defaultLead;
    score.hidden = true;
    result.hidden = true;
    round.hidden = false;
    launch.textContent = "Quiz einklappen";
    renderQuestion();
    questionHeading.focus();
  });

  steps.replaceChildren(...questions.map(() => make("span")));
  facts.hidden = true;
  launch.hidden = false;
})();
