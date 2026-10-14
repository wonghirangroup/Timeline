const run = require('./emp_harness')
const O = 'C:/Users/User/Downloads/yoonai-website/public/employee/'
require('fs').mkdirSync(O, { recursive: true })
const clickText = t => async p => {
  await p.evaluate(t => { const el = [...document.querySelectorAll('button,div,span')].filter(e => e.children.length < 3 && e.textContent.trim() === t)[0]; el && el.click() }, t)
  await new Promise(r => setTimeout(r, 1200))
}
run([
  { path: '/checkin', out: O + 'checkin.png' },
  { path: '/history', out: O + 'history.png' },
  { path: '/history', out: O + 'history-leave.png', act: clickText('วันลา') },
  { path: '/leave', out: O + 'leave.png' },
  { path: '/leave', out: O + 'leave-request.png', act: clickText('ขอลา') },
  { path: '/profile', out: O + 'profile.png' },
])
