(() => {
  const answers = { temptation: null, pain: null, budget: null };

  const result = document.getElementById("result");
  const resultTitle = document.getElementById("result-title");
  const resultCopy = document.getElementById("result-copy");
  const resultLink = document.getElementById("result-link");
  const q2 = document.getElementById("q2");
  const q3 = document.getElementById("q3");

  const outcomes = {
    skip: {
      title: "Skip. Buy nothing.",
      copy: "This is FOMO dressed as productivity. Keep your money. Your current phone / notes app already wins.",
      query: null,
      skip: true,
    },
    gan: {
      title: "Buy instead: one GaN charger",
      copy: "Fix the brick pile before you buy another gadget. A reputable 65W+ GaN charger removes daily friction.",
      query: "Anker 65W GaN USB-C charger",
    },
    earbuds: {
      title: "Buy instead: midrange buds that fit",
      copy: "Skip the flagship tax. Get proven midrange earbuds (or replacement tips) — fit beats yearly marketing.",
      query: "Sony WF-C700N earbuds",
    },
    desk: {
      title: "Buy instead: laptop stand + cable clips",
      copy: "Skip the standing-desk sponsorship. Raise the screen, tame the cables. Boring. Effective.",
      query: "aluminum laptop stand desk",
    },
    plug: {
      title: "Buy instead: a dumb-smart Matter plug",
      copy: "If you want ‘smart,’ buy local control without a subscription landlord.",
      query: "Matter smart plug no subscription",
    },
    arm: {
      title: "Buy instead: a monitor arm",
      copy: "Neck pain is a real problem. An arm is a real fix. RGB furniture is not.",
      query: "VIVO monitor arm single",
    },
  };

  function pickOutcome() {
    if (answers.pain === "boredom") return outcomes.skip;
    if (answers.temptation === "ai-gadget") {
      return answers.pain === "friction" ? outcomes.gan : outcomes.skip;
    }
    if (answers.temptation === "earbuds") {
      if (answers.pain === "broken") return outcomes.earbuds;
      if (answers.budget === "high" && answers.pain === "friction") return outcomes.earbuds;
      return answers.pain === "boredom" ? outcomes.skip : outcomes.earbuds;
    }
    if (answers.temptation === "charger-mess") return outcomes.gan;
    if (answers.temptation === "desk-flex") {
      if (answers.budget === "low") return outcomes.desk;
      if (answers.pain === "friction") return outcomes.arm;
      return outcomes.desk;
    }
    return outcomes.plug;
  }

  function showResult() {
    const outcome = pickOutcome();
    resultTitle.textContent = outcome.title;
    resultCopy.textContent = outcome.copy;
    result.classList.add("is-visible");
    result.classList.toggle("is-skip", Boolean(outcome.skip));

    if (outcome.skip) {
      resultLink.textContent = "Read this week’s skip list →";
      resultLink.href = "../posts/ai-junk.html";
      resultLink.removeAttribute("data-aff-query");
      resultLink.removeAttribute("target");
      resultLink.setAttribute("rel", "noopener");
    } else {
      resultLink.textContent = "Buy the instead →";
      resultLink.setAttribute("data-aff-query", outcome.query);
      if (window.SkipAffiliates) {
        resultLink.href = window.SkipAffiliates.searchUrl(outcome.query);
        resultLink.setAttribute("rel", "nofollow sponsored noopener");
        resultLink.setAttribute("target", "_blank");
        resultLink.onclick = () => window.SkipAffiliates.recordClick(outcome.query);
      }
    }
    result.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  document.querySelectorAll(".decide-options").forEach((group) => {
    group.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-value]");
      if (!btn) return;
      const step = group.getAttribute("data-step");
      answers[step] = btn.getAttribute("data-value");
      group.querySelectorAll("button").forEach((b) => b.classList.remove("is-on"));
      btn.classList.add("is-on");

      if (step === "temptation") {
        q2.hidden = false;
        q2.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      if (step === "pain") {
        q3.hidden = false;
        q3.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      if (step === "budget") showResult();
    });
  });
})();
