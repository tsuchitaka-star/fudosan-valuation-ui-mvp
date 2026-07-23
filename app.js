(function () {
  var state = {
    propertyType: "mansion",
    propertyTypeLabel: "中古マンション"
  };

  var labels = {
    mansion: "中古マンション",
    land: "土地",
    landBuilding: "土地＋建物"
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function value(id) {
    var el = byId(id);
    return el ? String(el.value || "").trim() : "";
  }

  function numberValue(id) {
    return Number(value(id) || 0);
  }

  function showMessage(text) {
    var el = byId("message");
    if (el) el.textContent = text || "";
  }

  function go(step) {
    document.querySelectorAll(".screen").forEach(function (screen) {
      screen.classList.toggle("is-active", screen.dataset.step === step);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setupEntryMotion() {
    var hero = document.querySelector(".corp-hero");
    if (!hero) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var ticking = false;

    function updateHero() {
      ticking = false;
      if (reduceMotion.matches) {
        hero.style.setProperty("--hero-progress", "0");
        return;
      }

      var rect = hero.getBoundingClientRect();
      var distance = Math.max(hero.offsetHeight - window.innerHeight, 1);
      var progress = Math.min(Math.max(-rect.top / distance, 0), 1);
      hero.style.setProperty("--hero-progress", progress.toFixed(4));
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateHero);
    }

    var revealTargets = document.querySelectorAll(
      ".usecase-band > *, .mission-media, .band-copy, #services .section-head, .service-card, .flow-grid article"
    );

    if (!reduceMotion.matches && "IntersectionObserver" in window) {
      revealTargets.forEach(function (target) {
        target.classList.add("scroll-reveal");
      });

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.14 });

      revealTargets.forEach(function (target) {
        observer.observe(target);
      });
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    reduceMotion.addEventListener("change", requestUpdate);
    updateHero();
  }
  function setPropertyType(type) {
    state.propertyType = type;
    state.propertyTypeLabel = labels[type] || labels.mansion;

    var typeLabel = byId("typeLabel");
    if (typeLabel) typeLabel.textContent = state.propertyTypeLabel;

    document.querySelectorAll(".mansion-only").forEach(function (el) {
      el.classList.toggle("hidden", type !== "mansion");
    });
    document.querySelectorAll(".land-only").forEach(function (el) {
      el.classList.toggle("hidden", !(type === "land" || type === "landBuilding"));
    });
    document.querySelectorAll(".land-building-only").forEach(function (el) {
      el.classList.toggle("hidden", type !== "landBuilding");
    });
    document.querySelectorAll(".not-land-only").forEach(function (el) {
      el.classList.toggle("hidden", type === "land");
    });

    var targetWrap = byId("targetAreaWrap");
    if (targetWrap) targetWrap.classList.toggle("hidden", type === "landBuilding");
  }

  function validateBasics() {
    if (!value("zipcode")) {
      showMessage("郵便番号を入力してください。");
      byId("zipcode").focus();
      return false;
    }
    if (!value("addressBase")) {
      showMessage("住所を入力してください。");
      byId("addressBase").focus();
      return false;
    }
    if (!value("stationName")) {
      showMessage("最寄駅を入力してください。");
      byId("stationName").focus();
      return false;
    }
    if (!value("walkMinutes")) {
      showMessage("徒歩分数を入力してください。");
      byId("walkMinutes").focus();
      return false;
    }

    if (state.propertyType === "landBuilding") {
      if (!numberValue("landArea")) {
        showMessage("土地面積を入力してください。");
        byId("landArea").focus();
        return false;
      }
      if (!numberValue("buildingTotalArea")) {
        showMessage("建物延床面積を入力してください。");
        byId("buildingTotalArea").focus();
        return false;
      }
    } else if (!numberValue("targetArea")) {
      showMessage("面積を入力してください。");
      byId("targetArea").focus();
      return false;
    }

    if (state.propertyType === "mansion" && value("floorPlan") === "unknown") {
      showMessage("間取りを選んでください。");
      byId("floorPlan").focus();
      return false;
    }

    showMessage("");
    return true;
  }

  function formatManYen(n) {
    return Math.round(n).toLocaleString("ja-JP") + "万円";
  }

  function mockUnitPrice() {
    var walk = numberValue("walkMinutes") || 10;
    var age = numberValue("buildingAge") || 15;
    var base = state.propertyType === "land" ? 48 : state.propertyType === "landBuilding" ? 42 : 66;
    var score = base + Math.max(0, 12 - walk) * 0.35 - Math.max(0, age - 10) * 0.18;
    if (value("sunlight") === "good") score += 1.2;
    if (value("viewQuality") === "good") score += 0.8;
    if (value("rebuildable") === "no") score -= 10;
    if (value("landRight") === "leasehold") score -= 8;
    if (value("management") === "good") score += 1;
    if (value("renovation") === "renovated") score += 1.5;
    return Math.max(score, 12);
  }

  function mockValuation() {
    var unit = mockUnitPrice();
    var area = state.propertyType === "landBuilding"
      ? numberValue("landArea")
      : numberValue("targetArea") || 65;
    var buildingAdd = state.propertyType === "landBuilding"
      ? numberValue("buildingTotalArea") * Math.max(8, 24 - numberValue("buildingAge") * 0.4)
      : 0;
    var market = state.propertyType === "mansion" ? 1.02 : state.propertyType === "land" ? 1.16 : 1.12;
    var condition = 0;

    if (numberValue("walkMinutes") && numberValue("walkMinutes") <= 5) condition += 2;
    if (value("direction") === "south") condition += 1;
    if (value("sunlight") === "good") condition += 1;
    if (value("management") === "poor") condition -= 2;
    if (value("renovation") === "needed") condition -= 2;

    var bad = 0;
    if (value("rebuildable") === "no") bad -= 20;
    if (value("landShape") === "irregular") bad -= 8;
    if (value("landRight") === "leasehold") bad -= 18;

    var base = unit * area + buildingAdd;
    var adjusted = base * (1 + condition / 100) * market * (1 + bad / 100);
    var finalPrice = Math.max(adjusted, 0);

    byId("recommendedPrice").textContent = formatManYen(finalPrice);
    byId("midPrice").textContent = formatManYen(finalPrice);
    byId("quickPrice").textContent = formatManYen(finalPrice * 0.94);
    byId("challengePrice").textContent = formatManYen(finalPrice * 1.03);
    byId("contractBasePrice").textContent = formatManYen(base);
    byId("conditionAdjustmentTotal").textContent = (condition > 0 ? "+" : "") + condition.toFixed(1) + "%";
    byId("marketAdjustmentFactor").textContent = market.toFixed(2) + "倍";
    byId("badConditionAdjustmentTotal").textContent = (bad > 0 ? "+" : "") + bad.toFixed(1) + "%";
    byId("unitPrice").textContent = (Math.round(unit * 10) / 10).toLocaleString("ja-JP") + "万円/㎡";
    byId("sampleCount").textContent = state.propertyType === "mansion" ? "48件" : "31件";
    byId("marketTrendLabel").textContent = walkishTrend();
    byId("liquidityLabel").textContent = numberValue("walkMinutes") <= 8 ? "駅近寄りで流通性は高めです。" : "流通性は標準です。";
    byId("methodLabel").textContent = state.propertyType === "landBuilding"
      ? "土地：取引比較 / 建物：原価法"
      : "取引比較 + 条件補正";
    byId("resultSummary").textContent = state.propertyTypeLabel + "としての参考価格です。建設・不動産の条件整理に基づくデモ計算です。";

    renderDemoCases(unit);
    renderDemoAdjustments(condition, bad);
  }

  function walkishTrend() {
    var walk = numberValue("walkMinutes") || 10;
    if (walk <= 6) return "駅近需要が強く、相場は上向き寄りです。";
    if (walk >= 15) return "駅距離がやや長く、相場は慎重に見る必要があります。";
    return "このエリアは横ばい寄りです。";
  }

  function renderDemoCases(unit) {
    var area = state.propertyType === "landBuilding" ? numberValue("landArea") : numberValue("targetArea") || 65;
    var rows = [
      { district: "近隣A", area: Math.round(area * 0.95), year: "2024年" },
      { district: "近隣B", area: Math.round(area * 1.05), year: "2023年" },
      { district: "近隣C", area: Math.round(area * 0.9), year: "2024年" }
    ];
    byId("casesBody").innerHTML = rows.map(function (row, index) {
      var unitShift = unit * (1 + (index - 1) * 0.03);
      var price = unitShift * row.area;
      return "<tr><td>" + row.district + "</td><td>" + row.area + "㎡</td><td>" +
        formatManYen(price) + "</td><td>" + (Math.round(unitShift * 10) / 10).toLocaleString("ja-JP") +
        "万円/㎡</td><td>" + row.year + "</td></tr>";
    }).join("");
  }

  function renderDemoAdjustments(condition, bad) {
    var items = [];
    if (numberValue("walkMinutes") && numberValue("walkMinutes") <= 5) items.push(["駅徒歩", "+2.0%"]);
    if (value("direction") === "south") items.push(["方角", "+1.0%"]);
    if (value("sunlight") === "good") items.push(["日当たり", "+1.0%"]);
    if (value("management") === "poor") items.push(["管理状態", "-2.0%"]);
    if (value("renovation") === "needed") items.push(["リフォーム", "-2.0%"]);
    if (value("rebuildable") === "no") items.push(["再建築不可", "-20.0%"]);
    if (value("landShape") === "irregular") items.push(["不整形地", "-8.0%"]);
    if (value("landRight") === "leasehold") items.push(["借地権", "-18.0%"]);
    if (!items.length) items.push(["条件補正", condition === 0 && bad === 0 ? "0%" : "反映済み"]);

    byId("adjustments").innerHTML = items.map(function (item) {
      var cls = String(item[1]).indexOf("-") === 0 ? "minus" : "plus";
      return "<div class='adj'><span>" + item[0] + "</span><strong class='" + cls + "'>" + item[1] + "</strong></div>";
    }).join("");
  }

  function runValuation() {
    if (!validateBasics()) {
      go("location");
      return;
    }
    mockValuation();
    go("result");
  }

  document.querySelectorAll("[data-go]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var type = btn.getAttribute("data-type");
      if (type) setPropertyType(type);
      go(btn.getAttribute("data-go"));
    });
  });

  byId("lookupBtn").addEventListener("click", function () {
    if (!value("zipcode")) {
      showMessage("郵便番号を入力してください。");
      return;
    }
    if (!value("addressBase")) {
      byId("addressBase").value = "東京都千代田区永田町";
    }
    byId("areaNote").textContent = "対象エリア：東京都 千代田区（デモ）";
    showMessage("住所を入力しました。（デモ）");
  });

  byId("detectBtn").addEventListener("click", function () {
    if (!value("addressBase")) {
      showMessage("先に住所を入力してください。");
      return;
    }
    if (!value("stationName")) byId("stationName").value = "国会議事堂前";
    if (!value("walkMinutes")) byId("walkMinutes").value = "8";
    byId("areaNote").textContent = "対象エリア：東京都 千代田区 / 国会議事堂前 徒歩8分（デモ）";
    showMessage("最寄駅を検知しました。（デモ）");
  });

  byId("runQuick").addEventListener("click", runValuation);
  byId("runFull").addEventListener("click", runValuation);

  setPropertyType("mansion");
  setupEntryMotion();
  go("entry");
})();
