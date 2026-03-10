import { useState } from 'react'
import './App.css'
import QuestionGeneration from './Components/QuestionGeneration'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <div>
      <QuestionGeneration/>
    </div>
        
    </>
  )
}

export default App
