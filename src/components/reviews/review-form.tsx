"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  tripId: string;
}

export function ReviewForm({ tripId }: ReviewFormProps) {
  const [rating, setRating] = useState(0);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="space-y-2">
        <Label>Avaliação</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} estrelas`}
              onClick={() => setRating(value)}
              className="rounded p-1 text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
            >
              <Star
                className={cn(
                  "h-6 w-6",
                  value <= rating && "fill-[var(--accent)] text-[var(--accent)]",
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="comment">Comentário</Label>
        <Textarea id="comment" name="comment" placeholder="Como correu a viagem?" />
      </div>
      <Button type="submit" disabled={rating === 0}>
        Enviar avaliação
      </Button>
    </form>
  );
}
