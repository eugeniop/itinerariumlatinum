function About() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">About Itinerarium Latinum</h1>
          <p className="mb-2">
              This is my own Latin course. Developed to learn Latin.
          </p>
          <p className="mb-2">
            This is not a professionally developed course, and it contains errors and no pedagogical structure. All opinions here are mine. All content is posted here as is, with no warranties of any kind.
          </p>
          <p className="mb-2">
            You are unlikely to learn Latin from this course, but you may find it useful to learn about my own journey in learning the language (possibly).
          </p>
          <p className="mb-2">
            <strong>Omnium enim rerum principia parva sunt</strong>
          </p>
          <p className="mb-2">
              Written and maintained by <strong>Eugenio Pace</strong>.
          </p><p className="mt-6">
              <a href={import.meta.env.BASE_URL} className="text-blue-600 underline">← Home</a>
          </p>
    </div>
  )
}

export default About
