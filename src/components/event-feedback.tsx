"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Star, MessageSquare, Send, CheckCircle2, ShieldCheck, Trash2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FeedbackItem {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image?: string | null;
    role: string;
  };
}

interface EventFeedbackProps {
  eventId: string;
  canSubmitFeedback: boolean; // True if checked in
  initialFeedbacks?: FeedbackItem[];
  initialAverage?: number;
  initialTotal?: number;
}

export function EventFeedback({
  eventId,
  canSubmitFeedback,
  initialFeedbacks = [],
  initialAverage = 0,
  initialTotal = 0,
}: EventFeedbackProps) {
  const { data: session } = useSession();
  const [feedbacks, setFeedbacks] = React.useState<FeedbackItem[]>(initialFeedbacks);
  const [averageRating, setAverageRating] = React.useState(initialAverage);
  const [totalReviews, setTotalReviews] = React.useState(initialTotal);
  const [userReview, setUserReview] = React.useState<FeedbackItem | null>(null);

  // Form State
  const [selectedRating, setSelectedRating] = React.useState<number>(5);
  const [hoverRating, setHoverRating] = React.useState<number>(0);
  const [comment, setComment] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);

  const fetchFeedbackData = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/feedback`);
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.feedbacks || []);
        setAverageRating(data.averageRating || 0);
        setTotalReviews(data.totalReviews || 0);
        if (data.userFeedback) {
          setUserReview(data.userFeedback);
          setSelectedRating(data.userFeedback.rating);
          setComment(data.userFeedback.comment || "");
        }
      }
    } catch (e) {
      console.error("Failed to load feedback:", e);
    }
  }, [eventId]);

  React.useEffect(() => {
    fetchFeedbackData();
  }, [fetchFeedbackData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRating || selectedRating < 1 || selectedRating > 5) {
      setSubmitError("Please select a star rating from 1 to 5.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch(`/api/events/${eventId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: selectedRating, comment }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review.");
      }

      setSubmitSuccess("Thank you! Your feedback has been recorded.");
      setIsEditing(false);
      await fetchFeedbackData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting review.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove your review?")) return;
    try {
      const res = await fetch(`/api/events/${eventId}/feedback`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUserReview(null);
        setSelectedRating(5);
        setComment("");
        setIsEditing(false);
        await fetchFeedbackData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pt-4 border-t border-border/60">
      {/* Header and Rating Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span>Attendee Feedback & Ratings</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reviews from verified students who attended this workshop.
          </p>
        </div>

        {totalReviews > 0 ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-1.5 self-start sm:self-auto">
            <div className="flex items-center text-amber-400">
              <Star className="h-4 w-4 fill-amber-400" />
            </div>
            <span className="font-mono text-base font-bold text-foreground">
              {averageRating.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              / 5.0 ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
            </span>
          </div>
        ) : (
          <span className="text-xs font-mono text-muted-foreground">
            No reviews yet
          </span>
        )}
      </div>

      {/* Review Submission Form / User Existing Review State */}
      {canSubmitFeedback ? (
        <div className="rounded-xl border border-border/70 bg-secondary/15 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>
                {userReview && !isEditing
                  ? "Your Verified Attendee Review"
                  : userReview && isEditing
                  ? "Edit Your Workshop Review"
                  : "Rate Your Workshop Experience"}
              </span>
            </div>
            <Badge variant="success" className="text-[10px] uppercase font-mono">
              Verified Attendee
            </Badge>
          </div>

          {userReview && !isEditing ? (
            /* Existing Review Display */
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-4 w-4",
                      star <= userReview.rating
                        ? "text-amber-400 fill-amber-400"
                        : "text-muted-foreground/40"
                    )}
                  />
                ))}
                <span className="text-xs font-bold font-mono ml-2 text-foreground">
                  {userReview.rating} out of 5 stars
                </span>
              </div>

              {userReview.comment && (
                <p className="text-xs text-foreground/90 italic bg-card/60 p-3 rounded-lg border border-border/50">
                  &ldquo;{userReview.comment}&rdquo;
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-7 text-xs gap-1.5"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Edit Review</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>
          ) : (
            /* Interactive Review Form */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Star Rating Picker */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Rating <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverRating || selectedRating) >= star;
                    return (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setSelectedRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-muted-foreground hover:scale-110 transition-transform focus:outline-none"
                      >
                        <Star
                          className={cn(
                            "h-6 w-6 transition-colors",
                            active
                              ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]"
                              : "text-muted-foreground/30"
                          )}
                        />
                      </button>
                    );
                  })}
                  <span className="font-mono text-xs text-muted-foreground ml-2">
                    {selectedRating === 5
                      ? "5/5 - Outstanding"
                      : selectedRating === 4
                      ? "4/5 - Very Good"
                      : selectedRating === 3
                      ? "3/5 - Good"
                      : selectedRating === 2
                      ? "2/5 - Fair"
                      : "1/5 - Poor"}
                  </span>
                </div>
              </div>

              {/* Comment Textarea */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Your Review & Takeaways (Optional)
                </label>
                <textarea
                  rows={3}
                  maxLength={600}
                  placeholder="Share what you learned, what you liked about the instructor, or suggestions for future workshops..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card/70 p-3 text-xs text-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Error / Success Messages */}
              {submitError && (
                <p className="text-[11px] text-destructive font-medium">
                  {submitError}
                </p>
              )}
              {submitSuccess && (
                <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{submitSuccess}</span>
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="gap-1.5 cyber-glow font-medium text-xs h-8"
                >
                  <Send className="h-3 w-3" />
                  <span>{isSubmitting ? "Submitting..." : userReview ? "Update Review" : "Post Review"}</span>
                </Button>
                {isEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="text-xs h-8"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      ) : (
        /* Prompt for other students */
        session?.user && (
          <div className="rounded-xl border border-border/50 bg-card/40 p-3.5 text-xs text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0 opacity-70" />
            <span>
              Ratings are exclusively available to verified students who registered and checked in to this workshop at the venue.
            </span>
          </div>
        )
      )}

      {/* Reviews List */}
      {feedbacks.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-mono uppercase font-bold text-muted-foreground tracking-wider">
            All Reviews ({feedbacks.length})
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {feedbacks.map((f) => {
              const reviewDate = new Date(f.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div
                  key={f.id}
                  className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-2.5 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        src={f.user.image}
                        name={f.user.name}
                        size={28}
                      />
                      <div>
                        <p className="text-xs font-semibold text-foreground leading-tight">
                          {f.user.name || "Student Member"}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {reviewDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-3 w-3",
                            star <= f.rating
                              ? "text-amber-400 fill-amber-400"
                              : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {f.comment && (
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      {f.comment}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
