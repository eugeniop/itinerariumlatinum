import { useEffect, useState } from 'react'
import fm from 'front-matter'

function Quiz({ sources }) {
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [activeLeft, setActiveLeft] = useState(null)
  const [instructions, setInstructions] = useState('')

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

  const handleCompleteWord = (qIdx, wi) => {
    if (submitted) return
    const updated = [...answers]
    updated[qIdx] = wi
    setAnswers(updated)
  }

  const handleAnswer = (qIdx, optionIdx, checked) => {
    if (!quiz || quiz[qIdx].type === 'match' || quiz[qIdx].type === 'sentence' || quiz[qIdx].type === 'complete') return
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
    setAnswers(updated)
    setActiveLeft(null)
  }

  const handleDone = () => {
    setSubmitted(true)
  }

  const handleReset = () => {
    if (quiz) {
      setAnswers(
        quiz.map((q) => {
          if (q.type === 'match') return {}
          if (q.type === 'sentence') return []
          if (q.type === 'complete') return null
          return Array.isArray(q.answer) && q.answer.length > 1 ? [] : null
        })
      )
    }
    setSubmitted(false)
    setActiveLeft(null)
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
          if (q.type === 'match') return {}
          if (q.type === 'sentence') return []
          if (q.type === 'complete') return null
          return q.answer.length > 1 ? [] : null
        }))
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
    }
  }, [sources])

  if (!quiz) return null

  return (
    <div>
      {instructions && (
        <p className="mb-4 italic">{instructions}</p>
      )}
      {quiz.map((q, qi) => {
        const isMatch = q.type === 'match'
        const isSentence = q.type === 'sentence'
        const isComplete = q.type === 'complete'
        const isCorrect = submitted && (isMatch
          ? Object.keys(q.answer).every((k) => (answers[qi] || {})[k] === q.answer[k]) &&
            Object.keys(answers[qi] || {}).length === Object.keys(q.answer).length
          : isSentence
            ? q.answer.length === (answers[qi] || []).length &&
              q.answer.every((w) => (answers[qi] || []).map((idx) => q.words[idx]).includes(w))
            : isComplete
              ? q.words[answers[qi]] === q.answer
              : (q.answer.length > 1
                  ? q.answer.every((a) => (answers[qi] || []).includes(a)) &&
                    (answers[qi] || []).length === q.answer.length
                  : answers[qi] === q.answer[0]))
        return (
          <div key={qi} className="mb-6">
            <p className="font-semibold mb-2">{q.prompt}</p>
            {isMatch ? (
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
                            ? 'bg-green-100'
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
                      className={`px-2 py-1 border rounded ${
                        Object.entries(answers[qi] || {}).some(([l, r]) => r === ri)
                          ? 'bg-gray-200'
                          : ''
                      }`}
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
            {submitted && (
              <p className={`mt-1 font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {isCorrect
                  ? 'Correct!'
                  : isMatch
                    ? 'Incorrect.'
                    : isSentence
                      ? `Incorrect. Correct answer: ${q.answer.join(' ')}`
                      : isComplete
                        ? `Incorrect. Correct answer: ${q.answer}`
                        : `Incorrect. Correct answer: ${q.answer
                            .map((a) => q.options[a])
                            .join(', ')}`}
              </p>
            )}
          </div>
        )
      })}

      {quiz.length > 0 && (
        <div className="mt-4">
          <button
            onClick={handleDone}
            className="bg-green-600 text-white px-4 py-2 rounded mr-2"
          >
            Done
          </button>
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
