import * as store from "./data/store.js";
import { REPORT_TYPES, CURRENT_SESSION } from "./config.js";

export const DEFAULT_WEIGHTS = { ca: 20, mid: 20, exam: 60 };

export const DEFAULT_GRADING_SCALE = {
  confirmed: false,
  boundaries: [
    { min: 70, grade: "A", remark: "Excellent" },
    { min: 60, grade: "B", remark: "Very Good" },
    { min: 50, grade: "C", remark: "Good" },
    { min: 40, grade: "D", remark: "Fair" },
    { min: 30, grade: "E", remark: "Pass" },
    { min: 0, grade: "F", remark: "Fail" }
  ]
};

export function getSchoolSettings() {
  return store.find("schoolSettings", (s) => s.settingsId === "main") || store.list("schoolSettings")[0] || null;
}

export function getWeights() {
  const settings = getSchoolSettings();
  return { ...DEFAULT_WEIGHTS, ...(settings && settings.weights ? settings.weights : {}) };
}

export function getGradingScale() {
  const settings = getSchoolSettings();
  const scale = settings && settings.gradingScale;
  if (scale && Array.isArray(scale.boundaries) && scale.boundaries.length) return scale;
  return DEFAULT_GRADING_SCALE;
}

export function getReportConfig() {
  const settings = getSchoolSettings();
  return (settings && settings.reportConfig) || {};
}

export function gradeFor(total, scale) {
  const s = scale || getGradingScale();
  const value = Number(total) || 0;
  const boundaries = [...s.boundaries].sort((a, b) => b.min - a.min);
  const hit = boundaries.find((b) => value >= b.min);
  return hit ? { grade: hit.grade, remark: hit.remark } : { grade: "F", remark: "Fail" };
}

export function levelGroupForClass(classId) {
  const cls = store.find("classes", (c) => c.classId === classId);
  if (cls && cls.levelGroup) return cls.levelGroup;
  const student = store.find("students", (s) => s.classId === classId);
  return (student && student.levelGroup) || "basic";
}

export function termSlug(termName) {
  const term = store.find("terms", (t) => t.name === termName);
  if (term && term.slug) return term.slug;
  return String(termName || "").toLowerCase().replace(/\s+/g, "-");
}

export function subjectsFor(levelGroup, reportType) {
  const cfg = getReportConfig();
  if (levelGroup === "nursery") {
    return cfg.nurserySubjects || [];
  }
  if (reportType === REPORT_TYPES.CUMULATIVE) {
    return cfg.basicCumulativeSubjects || cfg.basicTermlySubjects || [];
  }
  return cfg.basicTermlySubjects || [];
}

export function classLabel(classId) {
  const cls = store.find("classes", (c) => c.classId === classId);
  if (!cls) return classId || "";
  return `${cls.name}${cls.arm ? " " + cls.arm : ""}`.trim();
}

export function computeTermResult(result, { levelGroup, reportType } = {}) {
  if (!result) return null;
  const group = levelGroup || result.levelGroup || levelGroupForClass(result.classId);
  const type = reportType || REPORT_TYPES.TERMLY;
  const list = subjectsFor(group, type);
  const map = result.subjects || {};
  const scale = getGradingScale();

  const rows = list.map((s) => {
    const score = map[s.code];
    if (!score) return { code: s.code, label: s.label, ca: null, mid: null, exam: null, total: null, grade: "-", remark: "-", missing: true };
    const total = score.total != null ? score.total : (Number(score.ca) || 0) + (Number(score.mid) || 0) + (Number(score.exam) || 0);
    const g = gradeFor(total, scale);
    return {
      code: s.code,
      label: s.label,
      ca: Number(score.ca) || 0,
      mid: Number(score.mid) || 0,
      exam: Number(score.exam) || 0,
      total,
      grade: score.grade || g.grade,
      remark: score.remark || g.remark,
      missing: false
    };
  });

  const extraCodes = Object.keys(map).filter((code) => !list.some((s) => s.code === code));
  extraCodes.forEach((code) => {
    const score = map[code] || {};
    const total = score.total != null ? score.total : (Number(score.ca) || 0) + (Number(score.mid) || 0) + (Number(score.exam) || 0);
    const g = gradeFor(total, scale);
    rows.push({
      code,
      label: score.label || code,
      ca: Number(score.ca) || 0,
      mid: Number(score.mid) || 0,
      exam: Number(score.exam) || 0,
      total,
      grade: score.grade || g.grade,
      remark: score.remark || g.remark,
      missing: false
    });
  });

  const scored = rows.filter((r) => !r.missing);
  const subjectCount = scored.length;
  const totalScore = scored.reduce((a, r) => a + (Number(r.total) || 0), 0);
  const average = subjectCount ? Math.round((totalScore / subjectCount) * 100) / 100 : 0;

  return {
    rows,
    subjectCount,
    totalScore,
    average,
    classHighestAverage: result.classHighestAverage != null ? result.classHighestAverage : null,
    classLowestAverage: result.classLowestAverage != null ? result.classLowestAverage : null
  };
}

export function computeClassStats(classId, termName) {
  const scale = getGradingScale();
  const results = store.filter(
    "results",
    (r) =>
      r.classId === classId &&
      (!termName || r.termName === termName) &&
      (r.status === "published" || r.status === "approved")
  );
  const scored = results
    .map((r) => {
      const t = computeTermResult(r);
      return { studentId: r.studentId, average: t ? t.average : 0 };
    })
    .sort((a, b) => b.average - a.average);

  const positions = {};
  let lastAvg = null;
  let lastRank = 0;
  scored.forEach((s, i) => {
    const rank = s.average === lastAvg ? lastRank : i + 1;
    positions[s.studentId] = rank;
    lastAvg = s.average;
    lastRank = rank;
  });

  const averages = scored.map((s) => s.average);
  return {
    count: scored.length,
    highest: averages.length ? Math.max(...averages) : 0,
    lowest: averages.length ? Math.min(...averages) : 0,
    positions,
    scale
  };
}

export function scoreTotal(result, code) {
  const sc = (result.subjects || {})[code];
  if (!sc) return null;
  return sc.total != null ? sc.total : (Number(sc.ca) || 0) + (Number(sc.mid) || 0) + (Number(sc.exam) || 0);
}

export function computeCumulative(ordered, { levelGroup, reportType } = {}) {
  const list0 = ordered || [];
  const present = list0.filter(Boolean);
  if (!present.length) return null;
  const group = levelGroup || present[0].levelGroup || levelGroupForClass(present[0].classId);
  const type = reportType || REPORT_TYPES.CUMULATIVE;
  const list = subjectsFor(group, type);
  const scale = getGradingScale();
  const termNames = ["First Term", "Second Term", "Third Term"];

  const makeRow = (code, label) => {
    const vals = list0.map((r) => (r ? scoreTotal(r, code) : null));
    const scored = vals.filter((v) => v != null);
    if (!scored.length) return { code, label, terms: vals, average: null, grade: "-", remark: "-", missing: true };
    const avg = Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 100) / 100;
    const g = gradeFor(avg, scale);
    return { code, label, terms: vals, average: avg, grade: g.grade, remark: g.remark, missing: false };
  };

  const rows = list.map((s) => makeRow(s.code, s.label));

  const extraCodes = Object.keys(present[0].subjects || {}).filter((code) => !list.some((s) => s.code === code));
  extraCodes.forEach((code) => {
    const vals = list0.map((r) => (r ? scoreTotal(r, code) : null));
    if (vals.some((v) => v != null)) rows.push(makeRow(code, code));
  });

  const termSummary = list0.map((r, i) => {
    if (!r) return { term: termNames[i], average: null, remark: "-", total: null };
    const t = computeTermResult(r, { levelGroup: group, reportType: REPORT_TYPES.TERMLY });
    const g = gradeFor(t ? t.average : 0, scale);
    return { term: r.termName || termNames[i], average: t ? t.average : 0, remark: g.remark, total: t ? t.totalScore : 0 };
  });

  const scored = rows.filter((r) => !r.missing);
  const cumulativeAverage = scored.length
    ? Math.round((scored.reduce((a, r) => a + r.average, 0) / scored.length) * 100) / 100
    : 0;

  return { rows, termSummary, cumulativeAverage, subjectCount: scored.length, scale };
}

export function cumulativeForStudent(studentId, classId, levelGroup) {
  const results = store.filter("results", (r) => r.studentId === studentId && r.classId === classId);
  const bySlug = {};
  results.forEach((r) => {
    if (r.termSlug) bySlug[r.termSlug] = r;
  });
  const ordered = ["first-term", "second-term", "third-term"].map((slug) => bySlug[slug] || null);
  return computeCumulative(ordered, { levelGroup, reportType: REPORT_TYPES.CUMULATIVE });
}

export function computeCumulativeStats(classId, levelGroup) {
  const students = store.filter("students", (s) => s.classId === classId);
  const scored = students
    .map((s) => {
      const c = cumulativeForStudent(s.studentId, classId, levelGroup);
      const hasAny = c && c.rows.some((r) => !r.missing);
      return { studentId: s.studentId, average: hasAny ? c.cumulativeAverage : null };
    })
    .filter((x) => x.average != null)
    .sort((a, b) => b.average - a.average);
  const positions = {};
  let lastAvg = null;
  let lastRank = 0;
  scored.forEach((s, i) => {
    const rank = s.average === lastAvg ? lastRank : i + 1;
    positions[s.studentId] = rank;
    lastAvg = s.average;
    lastRank = rank;
  });
  const averages = scored.map((s) => s.average);
  return {
    count: scored.length,
    highest: averages.length ? Math.max(...averages) : 0,
    lowest: averages.length ? Math.min(...averages) : 0,
    positions,
    scale: getGradingScale()
  };
}

export function buildReportModel({ studentId, classId, termName, reportType = REPORT_TYPES.TERMLY }) {
  const student = store.find("students", (s) => s.studentId === studentId);
  if (!student) return null;
  const cid = classId || student.classId;
  const levelGroup = student.levelGroup || levelGroupForClass(cid);
  const type = reportType;
  const isCumulative = type === REPORT_TYPES.CUMULATIVE || /cumulative/i.test(type);
  const settings = getSchoolSettings() || {};
  const cfg = getReportConfig();
  const session = store.find("sessions", (s) => s.current) || { name: CURRENT_SESSION };

  const termResults = store.filter(
    "results",
    (r) => r.studentId === studentId && r.classId === cid && (isCumulative || r.termName === termName)
  );
  const termResult = isCumulative ? null : termResults[0] || null;

  const academic = isCumulative
    ? computeCumulative(
        ["first-term", "second-term", "third-term"].map((slug) => termResults.find((r) => r.termSlug === slug) || null),
        { levelGroup, reportType: type }
      )
    : computeTermResult(termResult, { levelGroup, reportType: type });

  const stats = isCumulative ? computeCumulativeStats(cid, levelGroup) : computeClassStats(cid, termName);
  const position = stats.positions[studentId] || null;

  const source = isCumulative ? termResults.find((r) => r.termSlug === "third-term") || termResults[0] || {} : termResult || {};

  return {
    meta: {
      schoolName: settings.name || "ROYALBRIDGE INT'L SCHOOL",
      motto: settings.motto || "Inspiring Excellence",
      coverAddress: cfg.coverAddress || "10 LADY STAR CRESCENT G/L ESTATE 3-3",
      session: session.name || CURRENT_SESSION,
      termName: isCumulative ? "CUMULATIVE" : termName,
      termSlug: isCumulative ? "cumulative" : termSlug(termName),
      reportType: isCumulative ? REPORT_TYPES.CUMULATIVE : REPORT_TYPES.TERMLY,
      reportTitle: levelGroup === "nursery"
        ? (isCumulative ? "NURSERY CUMULATIVE REPORT SHEET" : "NURSERY TERMLY REPORT SHEET")
        : (isCumulative ? "BASIC CUMULATIVE REPORT SHEET" : "BASIC TERMLY REPORT SHEET"),
      levelGroup,
      weights: getWeights(),
      student: {
        name: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
        admissionNumber: student.admissionNumber || "",
        className: classLabel(cid),
        age: student.age || "",
        sex: student.sex || ""
      },
      nextTermBegins: source.nextTermBegins || "",
      dueNextTerm: source.dueNextTerm != null ? source.dueNextTerm : "",
      affective: source.affective || {},
      psychomotor: source.psychomotor || {},
      teacherComment: source.teacherComment || "",
      headTeacherComment: source.headTeacherComment || "",
      proprietorComment: source.proprietorComment || "",
      parentComment: "",
      affectiveTraits: cfg.affectiveTraits || Object.keys(source.affective || {}),
      psychomotorSkills: cfg.psychomotorSkills || Object.keys(source.psychomotor || {}),
      ratingLegend: cfg.ratingLegend || ["EXCELLENT", "VERY GOOD", "GOOD", "FAIR", "POOR"],
      gradingScale: getGradingScale()
    },
    academic,
    position,
    classStats: { highest: stats.highest, lowest: stats.lowest, count: stats.count },
    resultId: termResult ? termResult.resultId : null,
    status: termResult ? termResult.status : null
  };
}
