import { useEffect, useState } from 'react'
import fm from 'front-matter'

function Quiz({ sources }) {
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [activeLeft, setActiveLeft] = useState(null)
  const [instructions, setInstructions] = useState('')
  const pairColors = [
    'bg-blue-200',
    'bg-green-200',
    'bg-red-200',
    'bg-purple-200',
    'bg-yellow-200',
    'bg-pink-200'
  ]
  const [pairColorMap, setPairColorMap] = useState([])

  const handleSentenceWord = (qIdx, wi) => {
    if (submitted) return
    const updated = [...answers]
    const current = updated[qIdx] ? [...updated[qIdx]] : []
    if (!current.includes(wi)) {
      current.push(wi)
      updated[qIdx] = current
      setAnswers(updated)
    }
  }

  const handleMissingWord = (qIdx, oi) => {
    if (submitted) return
    const updated = [...answers]
    updated[qIdx] = oi
    setAnswers(updated)
  }

  const handleSentenceReset = (qIdx) => {
    if (submitted) return
    const updated = [...answers]
    updated[qIdx] = []
    setAnswers(updated)
  }

  const handleCompleteWord = (qIdx, wi) => {
    if (submitted) return
    const updated = [...answers]
    updated[qIdx] = wi
    setAnswers(updated)
  }

  const handleAnswer = (qIdx, optionIdx, checked) => {
    if (!quiz || ['match', 'sentence', 'complete', 'missing'].includes(quiz[qIdx].type)) return
    const updated = [...answers]
    const isMulti = Array.isArray(quiz[qIdx].answer) && quiz[qIdx].answer.length > 1
    if (isMulti) {
      const current = new Set(updated[qIdx] || [])
      if (checked) {
        current.add(optionIdx)
      } else {
        current.delete(optionIdx)
      }
      updated[qIdx] = Array.from(current)
    } else {
      updated[qIdx] = optionIdx
    }
    setAnswers(updated)
  }

  const handlePairLeft = (qIdx, li) => {
    if (submitted) return
    setActiveLeft({ qIdx, li })
  }

  const handlePairRight = (qIdx, ri) => {
    if (submitted || !activeLeft || activeLeft.qIdx !== qIdx) return
    const updated = [...answers]
    const mapping = { ...(updated[qIdx] || {}) }
    mapping[activeLeft.li] = ri
    updated[qIdx] = mapping

    const colorState = [...pairColorMap]
    const cm = { ...(colorState[qIdx] || {}) }
    const colorIdx = cm[activeLeft.li] !== undefined ? cm[activeLeft.li] : Object.keys(cm).length % pairColors.length
    cm[activeLeft.li] = colorIdx
    colorState[qIdx] = cm

    setAnswers(updated)
    setPairColorMap(colorState)
    setActiveLeft(null)
  }

  const handleDone = () => {
    setSubmitted(true)
  }

  const handleReset = () => {
    if (sources && sources.length > 0) {
      const raw = sources[Math.floor(Math.random() * sources.length)]
      parseQuiz(raw)
    }
    setSubmitted(false)
    setActiveLeft(null)
    setPairColorMap([])
  }

  const parseQuiz = (raw) => {
    try {
      const { attributes } = fm(raw)
      if (attributes.questions) {
        if (attributes.instructions) {
          setInstructions(String(attributes.instructions))
        } else {
          setInstructions('')
        }
        const processed = attributes.questions.map((q) => {
          if (q.type === 'match' && Array.isArray(q.pairs)) {
            let pairs = [...q.pairs]
            if (pairs.length > 5) {
              pairs = pairs.sort(() => Math.random() - 0.5).slice(0, 5)
            }
            const left = pairs.map(p => Array.isArray(p) ? p[0] : p.left)
            const right = pairs.map(p => Array.isArray(p) ? p[1] : p.right)
            const leftShuffled = [...left].sort(() => Math.random() - 0.5)
            const rightShuffled = [...right].sort(() => Math.random() - 0.5)
            const ansMap = {}
            leftShuffled.forEach((lw, li) => {
              const origIdx = left.indexOf(lw)
              const rw = right[origIdx]
              ansMap[li] = rightShuffled.indexOf(rw)
            })
            return { type: 'match', prompt: q.prompt, left: leftShuffled, right: rightShuffled, answer: ansMap }
          } else if (q.type === 'syntax' && Array.isArray(q.pairs)) {
            const pairs = [...q.pairs]
            const left = pairs.map(p => Array.isArray(p) ? p[0] : p.left)
            const right = pairs.map(p => Array.isArray(p) ? p[1] : p.right)
            const rightShuffled = [...right].sort(() => Math.random() - 0.5)
            const ansMap = {}
            left.forEach((lw, li) => {
              const rw = right[li]
              ansMap[li] = rightShuffled.indexOf(rw)
            })
            return { type: 'syntax', prompt: q.prompt, left, right: rightShuffled, answer: ansMap }
          } else if (q.type === 'sentence') {
            const ansWords = Array.isArray(q.answer)
              ? q.answer
              : String(q.answer || '')
                  .split(/\s+/)
                  .filter(Boolean)
            const allWords = Array.isArray(q.words) && q.words.length > 0
              ? q.words
              : ansWords
            const shuffledWords = [...allWords].sort(() => Math.random() - 0.5)
            return { type: 'sentence', prompt: q.prompt, words: shuffledWords, answer: ansWords }
          } else if (q.type && q.type.startsWith('complete')) {
            const ansWord = Array.isArray(q.answer)
              ? q.answer[0]
              : String(q.answer || '')
            const allWords = Array.isArray(q.words) && q.words.length > 0
              ? q.words
              : [ansWord]
            const shuffledWords = [...allWords].sort(() => Math.random() - 0.5)
            return {
              type: 'complete',
              prompt: q.prompt,
              latin: q.latin || q.prompt,
              words: shuffledWords,
              answer: ansWord,
            }
          } else if (q.type === 'missing') {
            let ans = q.answer
            if (typeof ans === 'string') {
              ans = ans
                .split(',')
                .map((a) => parseInt(a.trim(), 10))
                .filter((n) => !isNaN(n))
            } else if (!Array.isArray(ans)) {
              ans = [ans]
            }
            return {
              type: 'missing',
              prompt: q.prompt,
              options: q.options || [],
              answer: ans,
              explanation: q.explanation || '',
            }
          }
          let ans = q.answer
          if (typeof ans === 'string') {
            ans = ans
              .split(',')
              .map((a) => parseInt(a.trim(), 10))
              .filter((n) => !isNaN(n))
          } else if (!Array.isArray(ans)) {
            ans = [ans]
          }
          return { ...q, type: 'multiple', answer: ans }
        })
        const shuffled = processed.sort(() => Math.random() - 0.5).slice(0, 5)
        setQuiz(shuffled)
        setAnswers(shuffled.map((q) => {
          if (q.type === 'match' || q.type === 'syntax') return {}
          if (q.type === 'sentence') return []
          if (q.type === 'complete') return null
          if (q.type === 'missing') return null
          return q.answer.length > 1 ? [] : null
        }))
        setPairColorMap(shuffled.map((q) => (q.type === 'match' || q.type === 'syntax') ? {} : null))
        return true
      }
    } catch (err) {
      console.error('Failed to parse quiz', err)
    }
    return false
  }

  useEffect(() => {
    if (sources && sources.length > 0) {
      const raw = sources[Math.floor(Math.random() * sources.length)]
      parseQuiz(raw)
      setSubmitted(false)
      setPairColorMap([])
    }
  }, [sources])

  useEffect(() => {
    if (!quiz) return
    const allAnswered = quiz.every((q, idx) => {
      const ans = answers[idx]
      if (q.type === 'match' || q.type === 'syntax') {
        return ans && Object.keys(ans).length === Object.keys(q.answer).length
      }
      if (q.type === 'sentence') {
        return ans && ans.length === q.answer.length
      }
      if (q.type === 'complete' || q.type === 'missing') {
        return ans !== undefined && ans !== null
      }
      return q.answer.length > 1
        ? ans && ans.length === q.answer.length
        : ans !== undefined && ans !== null
    })
    if (allAnswered) setSubmitted(true)
  }, [answers, quiz])

  if (!quiz) return null
  const onlyMissing = quiz.every((q) => q.type === 'missing')

  return (
    <div>
      {instructions && (
        <p className="mb-4 italic">{instructions}</p>
      )}
      {quiz.map((q, qi) => {
        const isMatch = q.type === 'match'
        const isSyntax = q.type === 'syntax'
        const isSentence = q.type === 'sentence'
        const isComplete = q.type === 'complete'
        const isMissing = q.type === 'missing'
        const showNow = isMissing
          ? answers[qi] !== undefined && answers[qi] !== null
          : (isMatch || isSyntax)
            ? Object.keys(answers[qi] || {}).length === Object.keys(q.answer).length
            : submitted
        const isCorrect = showNow && ((isMatch || isSyntax)
          ? Object.keys(q.answer).every((k) => (answers[qi] || {})[k] === q.answer[k]) &&
            Object.keys(answers[qi] || {}).length === Object.keys(q.answer).length
          : isSentence
            ? q.answer.length === (answers[qi] || []).length &&
              q.answer.every((w) => (answers[qi] || []).map((idx) => q.words[idx]).includes(w))
            : isComplete
              ? q.words[answers[qi]] === q.answer
              : isMissing
                ? q.answer.includes(answers[qi])
              : (q.answer.length > 1
                  ? q.answer.every((a) => (answers[qi] || []).includes(a)) &&
                    (answers[qi] || []).length === q.answer.length
                  : answers[qi] === q.answer[0]))
        return (
          <div key={qi} className="mb-6">
            <div className="flex items-center mb-2">
              <p className="font-semibold mr-2">{q.prompt}</p>
              {isSentence && (
                <button
                  onClick={() => handleSentenceReset(qi)}
                  disabled={submitted}
                  className="text-sm text-blue-600 underline"
                >
                  Reset
                </button>
              )}
            </div>
              {isMatch || isSyntax ? (
                <div className="flex gap-4">
                <div className="flex flex-col gap-2">
                  {q.left.map((word, li) => (
                    <button
                      key={li}
                      onClick={() => handlePairLeft(qi, li)}
                      disabled={submitted}
                      className={`px-2 py-1 border rounded ${
                        activeLeft && activeLeft.qIdx === qi && activeLeft.li === li
                          ? 'bg-blue-200'
                          : answers[qi] && answers[qi][li] !== undefined
                            ? pairColors[(pairColorMap[qi] || {})[li] % pairColors.length]
                            : ''
                      }`}
                    >
                      {word}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  {q.right.map((word, ri) => (
                    <button
                      key={ri}
                      onClick={() => handlePairRight(qi, ri)}
                      disabled={submitted}
                      className={`px-2 py-1 border rounded ${(() => {
                        const entry = Object.entries(answers[qi] || {}).find(([l, r]) => r === ri)
                        if (entry) {
                          const colorIdx = (pairColorMap[qi] || {})[entry[0]]
                          return pairColors[colorIdx % pairColors.length]
                        }
                        return ''
                      })()}`}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            ) : isSentence ? (
              <div>
                <p className="mb-2">{(answers[qi] || []).map((wi) => q.words[wi]).join(' ')}</p>
                <div className="flex flex-wrap gap-2">
                  {q.words.map((word, wi) => (
                    <button
                      key={wi}
                      onClick={() => handleSentenceWord(qi, wi)}
                      disabled={submitted || (answers[qi] || []).includes(wi)}
                      className={`px-2 py-1 border rounded ${
                        (answers[qi] || []).includes(wi) ? 'bg-gray-200' : ''
                      }`}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            ) : isComplete ? (
              <div>
                <p className="mb-2">{(q.latin || q.prompt).replace('MISSING', answers[qi] !== undefined && answers[qi] !== null ? q.words[answers[qi]] : '_____')}</p>
                <div className="flex flex-wrap gap-2">
                  {q.words.map((word, wi) => (
                    <button
                      key={wi}
                      onClick={() => handleCompleteWord(qi, wi)}
                      disabled={submitted}
                      className={`px-2 py-1 border rounded ${
                        answers[qi] === wi ? 'bg-gray-200' : ''
                      }`}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            ) : isMissing ? (
              <div>
                <p className="mb-2">
                  {(() => {
                    const replacement =
                      answers[qi] !== undefined && answers[qi] !== null ? (
                        <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                          {q.options[answers[qi]]}
                        </span>
                      ) : (
                        '_____' 
                      )
                    const parts = q.prompt.split('MISSING')
                    return parts.flatMap((part, idx) =>
                      idx < parts.length - 1 ? [part, replacement] : part
                    )
                  })()}
                </p>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((word, wi) => (
                    <button
                      key={wi}
                      onClick={() => handleMissingWord(qi, wi)}
                      disabled={submitted}
                      className={`px-2 py-1 border rounded ${
                        answers[qi] === wi ? 'bg-gray-200' : ''
                      }`}
                    >
                      {word}
                    </button>
                  ))}
                </div>
                {showNow && (
                  <p className={`mt-1 font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {isCorrect ? 'Correct!' : `Incorrect. Correct answer${q.answer.length > 1 ? 's' : ''}: ${q.answer.map(a => q.options[a]).join(', ')}`}
                  </p>
                )}
                {!isCorrect && q.explanation && showNow && (
                  <p className="mt-1 text-red-600">{q.explanation}</p>
                )}
              </div>
            ) : (
              q.options.map((opt, oi) => (
                <label key={oi} className="block mb-1">
                  <input
                    type={q.answer.length > 1 ? 'checkbox' : 'radio'}
                    name={`q-${qi}`}
                    className="mr-2"
                    onChange={(e) => handleAnswer(qi, oi, e.target.checked)}
                    checked={
                      q.answer.length > 1
                        ? (answers[qi] || []).includes(oi)
                        : answers[qi] === oi
                    }
                    disabled={submitted}
                  />
                  {opt}
                </label>
              ))
            )}
            {showNow && !isMissing && (
              <>
                <p className={`mt-1 font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {isCorrect
                    ? 'Correct!'
                    : isMatch || isSyntax
                      ? 'Incorrect!'
                      : isSentence
                        ? `Incorrect. Correct answer: ${q.answer.join(' ')}`
                        : isComplete
                          ? `Incorrect. Correct answer: ${q.answer}`
                          : `Incorrect. Correct answer: ${q.answer
                              .map((a) => q.options[a])
                              .join(', ')}`}
                </p>
                {!isCorrect && q.explanation && (
                  <p className="mt-1 text-red-600">{q.explanation}</p>
                )}
              </>
            )}
          </div>
        )
      })}

      {quiz.length > 0 && (
        <div className="mt-4">
          <button
            onClick={handleReset}
            className="bg-gray-300 px-4 py-2 rounded"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}

export default Quiz
