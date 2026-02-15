"use client";

import { useEffect, useRef } from "react";

type Props = {
    isTalking: boolean;
    volume?: number; // Volume sonore entre 0 et ~1
    width?: number;
    height?: number;
};

export default function RobotAvatar({ isTalking, volume = 0, width = 200, height = 200 }: Props) {
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

            // --- FOND HOLOGRAPHIQUE ---
            const radialGrad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, width / 2);
            radialGrad.addColorStop(0, "rgba(6, 182, 212, 0.05)");
            radialGrad.addColorStop(1, "rgba(15, 23, 42, 0)");
            ctx.fillStyle = radialGrad;
            ctx.fillRect(0, 0, width, height);

            // --- HUD ROTATIF ---
            ctx.save();
            ctx.translate(centerX, centerY - 15);
            ctx.rotate(timeRef.current * 0.2);
            ctx.strokeStyle = "rgba(6, 182, 212, 0.15)";
            ctx.setLineDash([15, 30]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, 75, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Flottement constant
            const floatY = Math.sin(timeRef.current * 0.8) * 5;

            // --- CORPS / VISAGE ---
            ctx.shadowBlur = 20;
            ctx.shadowColor = "rgba(6, 182, 212, 0.5)";
            ctx.fillStyle = "#0f172a";
            ctx.strokeStyle = "#06b6d4";
            ctx.lineWidth = 2;

            // Tête
            ctx.beginPath();
            ctx.arc(centerX, centerY - 25 + floatY, 55, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Visage (Faceplate)
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#f8fafc";
            ctx.beginPath();
            ctx.ellipse(centerX, centerY - 5 + floatY, 48, 55, 0, 0, Math.PI * 2);
            ctx.fill();

            // --- YEUX ---
            if (blinkRef.current) {
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(centerX - 35, centerY - 10 + floatY);
                ctx.lineTo(centerX - 15, centerY - 10 + floatY);
                ctx.moveTo(centerX + 15, centerY - 10 + floatY);
                ctx.lineTo(centerX + 35, centerY - 10 + floatY);
                ctx.stroke();
            } else {
                ctx.fillStyle = "#0c4a6e";
                ctx.beginPath();
                ctx.arc(centerX - 25, centerY - 10 + floatY, 5, 0, Math.PI * 2);
                ctx.arc(centerX + 25, centerY - 10 + floatY, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            // --- BOUCHE DYNAMIQUE (LIP-SYNC RÉEL) ---
            // L'ouverture de la bouche dépend directement du volume passé
            const openFactor = isTalking ? Math.max(0.1, volume * 1.5) : 0;
            const mouthWidth = 12 + openFactor * 10;
            const mouthHeight = openFactor * 25;

            ctx.strokeStyle = "#f472b6";
            ctx.lineWidth = 3;
            ctx.lineCap = "round";

            ctx.beginPath();
            // Forme de bulle / bouche qui s'ouvre
            if (openFactor > 0.15) {
                // Bouche ouverte (Ovale)
                ctx.ellipse(centerX, centerY + 28 + floatY, mouthWidth / 2, mouthHeight / 2, 0, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(244, 114, 182, 0.2)";
                ctx.fill();
            } else {
                // Bouche fermée ou presque (Ligne légèrement courbée)
                ctx.moveTo(centerX - 10, centerY + 30 + floatY);
                ctx.quadraticCurveTo(centerX, centerY + 30 + floatY + (isTalking ? 2 : 0), centerX + 10, centerY + 30 + floatY);
            }
            ctx.stroke();

            // Effet de lueur sur la bouche
            if (isTalking && openFactor > 0.2) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = "#f472b6";
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // Badge central
            ctx.fillStyle = isTalking ? "#f472b6" : "#22d3ee";
            ctx.beginPath();
            ctx.arc(centerX, centerY + 100 + floatY, 4, 0, Math.PI * 2);
            ctx.fill();

            frameRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [isTalking, volume, width, height]);

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
