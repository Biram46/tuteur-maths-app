"use client";

import { useEffect, useRef } from "react";

type Props = {
    isTalking: boolean;
    width?: number;
    height?: number;
};

export default function RobotAvatar({ isTalking, width = 200, height = 200 }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameRef = useRef<number>(0);
    const timeRef = useRef<number>(0);

    // Yeux ouverts ou fermés (clignement)
    const blinkRef = useRef<boolean>(false);
    const blinkTimerRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const render = () => {
            timeRef.current += 0.05;
            blinkTimerRef.current += 1;

            // Gestion du clignement
            if (blinkTimerRef.current > 150) {
                blinkRef.current = true;
                if (blinkTimerRef.current > 160) {
                    blinkRef.current = false;
                    blinkTimerRef.current = 0;
                }
            } else if (Math.random() > 0.995) {
                blinkTimerRef.current = 150;
            }

            ctx.clearRect(0, 0, width, height);

            const centerX = width / 2;
            const centerY = height / 2;

            // --- FOND HOLOGRAPHIQUE (Effet de profondeur) ---
            const radialGrad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, width / 2);
            radialGrad.addColorStop(0, "rgba(6, 182, 212, 0.05)");
            radialGrad.addColorStop(1, "rgba(15, 23, 42, 0)");
            ctx.fillStyle = radialGrad;
            ctx.fillRect(0, 0, width, height);

            // --- HUD ROTATIF (Arrière-plan) ---
            ctx.save();
            ctx.translate(centerX, centerY - 15);
            ctx.rotate(timeRef.current * 0.2);
            ctx.strokeStyle = "rgba(6, 182, 212, 0.15)";
            ctx.setLineDash([15, 30]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, 75, 0, Math.PI * 2);
            ctx.stroke();

            ctx.rotate(-timeRef.current * 0.5);
            ctx.strokeStyle = "rgba(244, 114, 182, 0.1)";
            ctx.setLineDash([5, 15]);
            ctx.beginPath();
            ctx.arc(0, 0, 85, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            ctx.setLineDash([]);

            // Lignes de scan horizontales
            ctx.fillStyle = "rgba(0, 255, 255, 0.03)";
            for (let i = 0; i < height; i += 3) {
                const opacity = 0.02 + Math.sin(timeRef.current + i * 0.1) * 0.01;
                ctx.fillStyle = `rgba(0, 255, 255, ${opacity})`;
                ctx.fillRect(0, i, width, 1);
            }

            // Flottement constant
            const floatY = Math.sin(timeRef.current * 0.8) * 5;

            // --- CORPS / CHEVEUX ---
            ctx.shadowBlur = 20;
            ctx.shadowColor = "rgba(6, 182, 212, 0.5)";

            // Base Cheveu
            ctx.fillStyle = "#0f172a";
            ctx.strokeStyle = "#06b6d4";
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(centerX, centerY - 25 + floatY, 55, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Chignon Tech
            ctx.beginPath();
            ctx.arc(centerX, centerY - 65 + floatY, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // --- VISAGE ---
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#f8fafc";
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.ellipse(centerX, centerY - 5 + floatY, 50, 58, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // --- FRANGE DIGITAL ---
            ctx.fillStyle = "#1e293b";
            ctx.beginPath();
            ctx.moveTo(centerX - 50, centerY - 35 + floatY);
            ctx.quadraticCurveTo(centerX - 25, centerY - 55 + floatY, centerX, centerY - 50 + floatY);
            ctx.quadraticCurveTo(centerX + 25, centerY - 55 + floatY, centerX + 50, centerY - 35 + floatY);
            ctx.lineTo(centerX + 50, centerY - 65 + floatY);
            ctx.lineTo(centerX - 50, centerY - 65 + floatY);
            ctx.closePath();
            ctx.fill();

            // --- LUNETTES HUD ---
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#f472b6";
            ctx.strokeStyle = "#f472b6";
            ctx.lineWidth = 2.5;

            // Verre HUD gauche
            ctx.fillStyle = "rgba(244, 114, 182, 0.15)";
            ctx.beginPath();
            ctx.roundRect(centerX - 42, centerY - 22 + floatY, 35, 25, 5);
            ctx.fill();
            ctx.stroke();

            // Verre HUD droit
            ctx.beginPath();
            ctx.roundRect(centerX + 7, centerY - 22 + floatY, 35, 25, 5);
            ctx.fill();
            ctx.stroke();

            // Micro-données sur les lunettes
            if (!blinkRef.current) {
                ctx.shadowBlur = 0;
                ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
                ctx.font = "6px monospace";
                // Petits points de data
                for (let i = 0; i < 3; i++) {
                    const xOff = (timeRef.current * 10 + i * 10) % 30;
                    ctx.fillRect(centerX - 35 + xOff, centerY - 15 + floatY, 2, 1);
                    ctx.fillRect(centerX + 15 + xOff, centerY - 10 + floatY, 1, 1);
                }
            }

            // --- YEUX ---
            ctx.shadowBlur = 0;
            if (blinkRef.current) {
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(centerX - 35, centerY - 10 + floatY);
                ctx.lineTo(centerX - 15, centerY - 10 + floatY);
                ctx.moveTo(centerX + 15, centerY - 10 + floatY);
                ctx.lineTo(centerX + 35, centerY - 10 + floatY);
                ctx.stroke();
            } else {
                ctx.fillStyle = "#0c4a6e";
                ctx.beginPath();
                ctx.arc(centerX - 25, centerY - 10 + floatY, 4, 0, Math.PI * 2);
                ctx.arc(centerX + 25, centerY - 10 + floatY, 4, 0, Math.PI * 2);
                ctx.fill();

                // Lueur pupille
                ctx.fillStyle = "#22d3ee";
                ctx.beginPath();
                ctx.arc(centerX - 25, centerY - 10 + floatY, 1.5, 0, Math.PI * 2);
                ctx.arc(centerX + 25, centerY - 10 + floatY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // --- BOUCHE (Ondulations sonores) ---
            if (isTalking) {
                const waveHeight = 2 + Math.abs(Math.sin(timeRef.current * 15)) * 10;
                ctx.strokeStyle = "#f472b6";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(centerX - 12, centerY + 25 + floatY);
                ctx.quadraticCurveTo(centerX, centerY + 25 + floatY - waveHeight, centerX + 12, centerY + 25 + floatY);
                ctx.quadraticCurveTo(centerX, centerY + 25 + floatY + waveHeight, centerX - 12, centerY + 25 + floatY);
                ctx.stroke();

                ctx.shadowBlur = 10;
                ctx.shadowColor = "#f472b6";
                ctx.stroke();
                ctx.shadowBlur = 0;
            } else {
                ctx.strokeStyle = "rgba(244, 114, 182, 0.6)";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(centerX - 8, centerY + 28 + floatY);
                ctx.quadraticCurveTo(centerX, centerY + 30 + floatY, centerX + 8, centerY + 28 + floatY);
                ctx.stroke();
            }

            // --- VÊTEMENT TECH ---
            ctx.shadowBlur = 15;
            ctx.shadowColor = "rgba(59, 130, 246, 0.3)";
            ctx.fillStyle = "#0f172a";
            ctx.beginPath();
            ctx.moveTo(centerX - 20, centerY + 70 + floatY);
            ctx.lineTo(centerX - 70, centerY + 95 + floatY);
            ctx.lineTo(centerX - 70, height);
            ctx.lineTo(centerX + 70, height);
            ctx.lineTo(centerX + 70, centerY + 95 + floatY);
            ctx.lineTo(centerX + 20, centerY + 70 + floatY);
            ctx.closePath();
            ctx.fill();

            // Détails du vêtement (Lignes néon)
            ctx.strokeStyle = "rgba(34, 211, 238, 0.4)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(centerX - 30, centerY + 80 + floatY);
            ctx.lineTo(centerX - 40, height);
            ctx.moveTo(centerX + 30, centerY + 80 + floatY);
            ctx.lineTo(centerX + 40, height);
            ctx.stroke();

            // Badge central lumineux
            ctx.fillStyle = isTalking ? "rgba(244, 114, 182, 0.8)" : "rgba(34, 211, 238, 0.5)";
            ctx.shadowBlur = 10;
            ctx.shadowColor = isTalking ? "#f472b6" : "#22d3ee";
            ctx.beginPath();
            ctx.arc(centerX, centerY + 100 + floatY, 4, 0, Math.PI * 2);
            ctx.fill();

            frameRef.current = requestAnimationFrame(render);
        };


        render();

        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [isTalking, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="mx-auto"
            style={{ maxWidth: '100%', height: 'auto' }}
        />
    );
}
