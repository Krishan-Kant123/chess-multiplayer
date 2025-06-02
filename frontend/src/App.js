import React from "react";
import {  Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Room from "./components/Room";
import { Toaster } from 'react-hot-toast';

function App() {
  return (
   <>
     <Toaster position="top-center" toastOptions={{
          style: {
            background: '#1f1f1f',
            color: '#fff',
          },
        }} reverseOrder={false} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
   </>
   
  );
}

export default App;
