/* Knowledge Quiz — interface strings (English). Load AFTER js/i18n.js. */
(function () {
  'use strict';
  var I = window.I18N = window.I18N || {};
  I.dict = I.dict || {};

  var S = {
    en: {
      'nav.quiz': 'Quiz',
      'quiz.title': 'Knowledge Quiz',
      'quiz.subtitle': 'How well do you know the history of Moon and Mars exploration — and the hardware that was left behind?',
      'quiz.setup.body': 'Destination',
      'quiz.body.all': 'All', 'quiz.body.moon': 'Moon', 'quiz.body.mars': 'Mars', 'quiz.body.both': 'Moon & Mars',
      'quiz.setup.cat': 'Category',
      'quiz.cat.all': 'All categories',
      'quiz.cat.apollo': 'Apollo Missions',
      'quiz.cat.lunar': 'Lunar Exploration',
      'quiz.cat.mars': 'Mars Exploration',
      'quiz.cat.rovers': 'Mars Rovers',
      'quiz.cat.equipment': 'Spacecraft and Equipment',
      'quiz.cat.abandoned': 'Abandoned Space Technology',
      'quiz.cat.discoveries': 'Scientific Discoveries',
      'quiz.cat.archaeology': 'Space Archaeology',
      'quiz.setup.diff': 'Difficulty',
      'quiz.diff.0': 'Mixed', 'quiz.diff.1': 'Easy', 'quiz.diff.2': 'Medium', 'quiz.diff.3': 'Hard',
      'quiz.setup.count': 'Questions',
      'quiz.count.all': 'All ({n})',
      'quiz.setup.available': '{n} questions match these settings',
      'quiz.setup.none': 'No questions match these settings — choose another category or difficulty.',
      'quiz.setup.random': 'Questions and answer options are shuffled every time.',
      'quiz.start': 'Start quiz',
      'quiz.progress': 'Question {i} of {n}',
      'quiz.score': 'Score: {s}',
      'quiz.tf.true': 'True', 'quiz.tf.false': 'False',
      'quiz.fb.correct': 'Correct!',
      'quiz.fb.wrong': 'Not quite.',
      'quiz.fb.answer': 'Correct answer: {a}',
      'quiz.source': 'Source', 'quiz.sources': 'Sources',
      'quiz.next': 'Next question', 'quiz.finish': 'See results', 'quiz.quit': 'Quit',
      'quiz.keys': 'Keyboard: 1–4 to answer, Enter for the next question.',
      'quiz.res.title': 'Your result',
      'quiz.res.score': '{s} of {n} correct',
      'quiz.res.m0': 'A good start — every mission begins with a launch. Read the explanations and try again!',
      'quiz.res.m1': 'Solid knowledge! Review the explanations and go for a higher score.',
      'quiz.res.m2': 'Impressive — you know your space history.',
      'quiz.res.m3': 'Mission accomplished — an outstanding result!',
      'quiz.res.bycat': 'By category',
      'quiz.res.review': 'Review your answers',
      'quiz.res.you': 'Your answer',
      'quiz.res.right': 'Correct answer',
      'quiz.res.prev': 'Previous attempt in this session: {s} of {n}',
      'quiz.res.nosave': 'Results are not saved: the site has no user accounts. They are kept only until you close or reload the page.',
      'quiz.retry': 'Try again (new order)',
      'quiz.retryWrong': 'Retry mistakes ({n})',
      'quiz.new': 'Change settings',
      'quiz.a11y.correct': 'correct answer', 'quiz.a11y.wrong': 'your answer, incorrect',
      'quiz.note': 'Every answer links to the published source of the fact (NASA, ESA and others).'
    },
  };

  Object.keys(S).forEach(function (lang) {
    var d = I.dict[lang] = I.dict[lang] || {};
    Object.keys(S[lang]).forEach(function (k) { if (!(k in d)) d[k] = S[lang][k]; });
  });
})();
