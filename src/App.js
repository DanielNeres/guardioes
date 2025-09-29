import React, { useState, useEffect, useCallback } from 'react';
import './App.css'; 
const ALGA_IMAGE_PATH = process.env.PUBLIC_URL + '/alga.png';

// Definições de estados do jogo
const GAME_STATE = {
  START: 'start',
  PLAYING: 'playing',
  GAMEOVER: 'gameover',
};

// Configurações do jogo
const GAME_SETTINGS = {
  PLAYER_SPEED_Y: 10, // Velocidade de movimento vertical do jogador
  RIVER_SPEED: 5,     // Velocidade de rolagem do rio/obstáculos
  OBSTACLE_INTERVAL_MS: 1300, // Intervalo para gerar novos obstáculos (um pouco mais rápido)
  RIVER_HEALTH_DECREASE_RATE_MS: 1000,
  RIVER_HEALTH_DECREASE_AMOUNT: 0.1, 
};

// Definição dos tipos de Obstáculos/Itens
const ITEM_TYPES = {
    LIXO_SACO: { emoji: '🛍️', damage: 10, points: 5, size: 5, text: 'Saco Plástico' },
    ANZOL: { emoji: '🎣', damage: 20, points: 0, size: 7, text: 'Anzol com Linha' },
    REDE: { emoji: '🕸️', damage: 30, points: 0, size: 9, text: 'Rede de Pesca' },
    ALIMENTO: { emoji: '🌱', heal: 45, points: 15, size: 6, text: 'Alimento Natural' },
};


function App() {
  // Estados do jogo
  const [gameState, setGameState] = useState(GAME_STATE.START);
  const [score, setScore] = useState(0);
  const [riverHealth, setRiverHealth] = useState(100); // 0 a 100
  const [playerPositionY, setPlayerPositionY] = useState(50); // Posição vertical do jogador (em %)
  const [obstacles, setObstacles] = useState([]); // Lista de obstáculos e itens
  const [gameTime, setGameTime] = useState(0); // Tempo de jogo para controlar dificuldade
  const [message, setMessage] = useState(''); // Mensagem de colisão

  // Função para reiniciar o jogo
  const resetGame = () => {
    setGameState(GAME_STATE.START);
    setScore(0);
    setRiverHealth(100);
    setPlayerPositionY(50);
    setObstacles([]);
    setGameTime(0);
    setMessage('');
  };

  // --- Efeitos do Jogo ---

  // Efeito para o Game Loop principal
  useEffect(() => {
    let gameLoopId;
    if (gameState === GAME_STATE.PLAYING) {
      gameLoopId = setInterval(() => {
        setGameTime(prev => prev + 1); 
        
        // Lógica para mover obstáculos - MUDANÇA
        setObstacles(prevObstacles =>
          prevObstacles
            .map(obs => ({ 
              ...obs, 
              // Usa a velocidade individual do obstáculo (obs.speed)
              x: obs.x - obs.speed 
            }))
            .filter(obs => obs.x > -50) 
        );
        // Diminui a saúde do rio (representando o desgaste do peixe ou o ambiente tóxico)
        setRiverHealth(prev => Math.max(0, prev - GAME_SETTINGS.RIVER_HEALTH_DECREASE_AMOUNT));

        if (riverHealth <= 0) {
          setGameState(GAME_STATE.GAMEOVER);
        }
      }, 50); // A cada 50ms, atualiza o estado do jogo
    }

    return () => clearInterval(gameLoopId);
  }, [gameState, riverHealth]);

  // Efeito para gerar novos obstáculos
  // Efeito para gerar novos obstáculos
  useEffect(() => {
  if (gameState !== GAME_STATE.PLAYING) return;

  // Função para agendar a próxima geração com intervalo aleatório
  const scheduleNextObstacle = () => {
    // Calcula o intervalo de tempo aleatório
    const randomInterval = 
      Math.random() * (GAME_SETTINGS.OBSTACLE_INTERVAL_MAX_MS - GAME_SETTINGS.OBSTACLE_INTERVAL_MIN_MS) + 
      GAME_SETTINGS.OBSTACLE_INTERVAL_MIN_MS;

    const obstacleGeneratorId = setTimeout(() => {
      // Posição Y aleatória (entre 10% e 90%)
      const randomY = Math.random() * 80 + 10; 
      const typeRoll = Math.random();
      
      let newItem = ITEM_TYPES.LIXO_SACO;
      // ... (Restante da lógica de seleção do item, que não mudou) ...

      if (typeRoll < 0.4) { 
        newItem = ITEM_TYPES.LIXO_SACO;
      } else if (typeRoll < 0.7) { 
        newItem = ITEM_TYPES.ANZOL;
      } else if (typeRoll < 0.85) { 
        newItem = ITEM_TYPES.REDE;
      } else if (typeRoll < 0.95) { 
        newItem = ITEM_TYPES.ALIMENTO;
      } else { 
        newItem = ITEM_TYPES.ESCUDO; 
      }
      
      // NOVIDADE: Velocidade horizontal aleatória (mais lenta)
      const randomSpeed = Math.random() * 2 + 1; // Velocidade entre 1 (mínimo) e 3 (máximo)
      
      const newObstacle = {
        id: Date.now() + Math.random(),
        x: 100, // Começa à direita
        y: randomY,
        speed: randomSpeed, // Salva a velocidade aleatória
        ...newItem,
        width: newItem.size, 
        height: newItem.size,
      };

      setObstacles(prevObstacles => [...prevObstacles, newObstacle]);
      
      // Agenda o próximo obstáculo imediatamente
      scheduleNextObstacle(); 

    }, randomInterval);

    return () => clearTimeout(obstacleGeneratorId);
  };
  
  // Inicia a primeira geração
  const cleanup = scheduleNextObstacle();
  return cleanup;

  }, [gameState]);


  // Efeito para detectar colisões e lidar com interações
  useEffect(() => {
    if (gameState === GAME_STATE.PLAYING) {
      setObstacles(prevObstacles =>
        prevObstacles.filter(obstacle => {
          // Calcular a área de colisão (simplificada)
          const playerLeft = 10; // Posição X fixa do jogador (10% da largura da tela)
          const playerRight = playerLeft + 5; // Largura do jogador 5%
          const playerTop = playerPositionY;
          const playerBottom = playerPositionY + 10; // Altura do jogador 10%

          const obstacleLeft = obstacle.x;
          const obstacleRight = obstacle.x + obstacle.width;
          const obstacleTop = obstacle.y;
          const obstacleBottom = obstacle.y + obstacle.height;

          // Colisão AABB (Axis-Aligned Bounding Box)
          const collided =
            playerLeft < obstacleRight &&
            playerRight > obstacleLeft &&
            playerTop < obstacleBottom &&
            playerBottom > obstacleTop;

          if (collided) {
            if (obstacle.emoji === ITEM_TYPES.ALIMENTO.emoji) {
              // Coleta alimento (cura)
              setScore(prev => prev + obstacle.points);
              setRiverHealth(prev => Math.min(100, prev + obstacle.heal));
              setMessage(`+${obstacle.heal} Saúde! ${obstacle.text}`);
              return false; // Remove item
            } else {
              // Colisão com lixo/perigo (dano)
              setRiverHealth(prev => Math.max(0, prev - obstacle.damage));
              setMessage(`- ${obstacle.damage} Saúde! Cuidado com o ${obstacle.text}!`);
              return false; // Remove obstáculo
            }
          }
          return true; // Mantém obstáculo se não houve colisão
        })
      );
      
      // Limpar mensagem após um curto período
      const timeout = setTimeout(() => setMessage(''), 1000);
      return () => clearTimeout(timeout);
    }
  }, [playerPositionY, obstacles, gameState]);

  // Efeito para controles do jogador
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState === GAME_STATE.PLAYING) {
        if (e.key === 'ArrowUp') {
          setPlayerPositionY(prev => Math.max(0, prev - GAME_SETTINGS.PLAYER_SPEED_Y));
        } else if (e.key === 'ArrowDown') {
          setPlayerPositionY(prev => Math.min(90, prev + GAME_SETTINGS.PLAYER_SPEED_Y)); 
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // --- Renderização dos Componentes ---


  


  const renderGameContent = () => {
    if (gameState === GAME_STATE.START) {
      return (
        <div className="game-screen start-screen">
          <h1>🐠 Guardiões da Água 🐠</h1>
          <p>Ajude o peixe a sobreviver! (ODS 14)</p>
          <button onClick={() => setGameState(GAME_STATE.PLAYING)}>Começar Jogo</button>
          <p>Use as setas ↑↓ para desviar dos perigos.</p>
          <p>Colete 🌱 para curar. Evite 🎣, 🕸️, 🛍️!</p>
        </div>
      );
    }

    if (gameState === GAME_STATE.GAMEOVER) {
      return (
        <div className="game-screen game-over-screen">
          <h1>Fim de Jogo! 💀</h1>
          <p>O ambiente ficou perigoso demais para a vida marinha.</p>
          <h2>Pontuação Final: {score}</h2>
          <button onClick={resetGame}>Jogar Novamente</button>
        </div>
      );
    }

    return (
      <>
        {/* HUD - Head-Up Display */}
        <div className="hud">
          <div className="score">Pontos: {score}</div>
          <div className="health-bar-container">
            Saúde:
            <div className="health-bar" style={{ width: `${riverHealth}%`, backgroundColor: riverHealth > 50 ? 'lightgreen' : riverHealth > 20 ? 'orange' : 'red' }}>
              {Math.floor(riverHealth)}%
            </div>
          </div>
          {message && <div className="collision-message">{message}</div>}
        </div>

        {/* Player */}
        <div
          className="player"
          style={{ top: `${playerPositionY}%` }}
        >
          🐠 {/* O peixe! */}
        </div>

        {/* Obstáculos e Itens */}
        {obstacles.map(obstacle => (
          <div
            key={obstacle.id}
            className="obstacle"
            style={{
              left: `${obstacle.x}%`,
              top: `${obstacle.y}%`,
              width: `${obstacle.size}%`,
              height: `${obstacle.size}%`,
              fontSize: `${obstacle.size * 0.8}vmin`, // Ajusta o tamanho do emoji
            }}
          >
            {obstacle.emoji}
          </div>
        ))}
      </>
    );
  };

/* ... dentro da função App() ... */

return (
    <div className="game-container">
       <div className="river-background">
        {/* Adiciona 10 bolhas para a animação */}
        {[...Array(20)].map((_, i) => (
          <div 
            key={i} 
            className="bubble" 
            style={{ 
                // Define um left aleatório entre 5% e 95%
                left: `${Math.random() * 90 + 5}%`, 
                // Define um tamanho e velocidade aleatórios para maior variedade
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                animationDuration: `${Math.random() * 10 + 5}s`,
                animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
        {/* Adiciona as plantas de fundo - AGORA COM ESTILO INLINE */}
        <div 
          className="water-plant plant-1" 
          style={{ backgroundImage: `url(${ALGA_IMAGE_PATH})` }} 
        />
        <div 
          className="water-plant plant-2" 
          style={{ backgroundImage: `url(${ALGA_IMAGE_PATH})` }}
        />
        <div 
          className="water-plant plant-3" 
          style={{ backgroundImage: `url(${ALGA_IMAGE_PATH})` }}
        />
      </div>
      {renderGameContent()} 
    </div>
  );
}

export default App;