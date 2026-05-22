import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Edit3, CheckCircle, HelpCircle, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Table, TableHead, TableRow } from "@/components/ui/Table";

type Question = {
  _id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  isActive: boolean;
};

export function QuizPage() {
  const [q, setQ] = useState("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formPrompt, setFormPrompt] = useState("");
  const [formOptions, setFormOptions] = useState<string[]>(["", "", "", ""]);
  const [formCorrectIndex, setFormCorrectIndex] = useState<number>(0);
  const [formDifficulty, setFormDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [formCategory, setFormCategory] = useState("general");
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchQuestions = () => {
    setLoading(true);
    const params = {
      q: q.trim() || undefined,
      difficulty: difficulty || undefined,
    };
    api
      .get("/admin/quiz/questions", { params })
      .then((res) => {
        setQuestions((res.data.items || []) as Question[]);
      })
      .catch((err) => {
        console.error("Failed to load questions", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQuestions();
  }, [q, difficulty]);

  const openAddModal = () => {
    setEditingQuestion(null);
    setFormPrompt("");
    setFormOptions(["", "", "", ""]);
    setFormCorrectIndex(0);
    setFormDifficulty("easy");
    setFormCategory("general");
    setFormIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (question: Question) => {
    setEditingQuestion(question);
    setFormPrompt(question.prompt);
    // Ensure we always have at least 4 items for styling consistency
    const opts = [...question.options];
    while (opts.length < 4) opts.push("");
    setFormOptions(opts);
    setFormCorrectIndex(question.correctIndex);
    setFormDifficulty(question.difficulty);
    setFormCategory(question.category || "general");
    setFormIsActive(question.isActive !== false);
    setModalOpen(true);
  };

  const deleteQuestion = async (id: string) => {
    const ok = window.confirm("Are you sure you want to delete this question?");
    if (!ok) return;
    try {
      await api.delete(`/admin/quiz/questions/${id}`);
      setQuestions((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      alert("Failed to delete question");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPrompt.trim()) {
      alert("Prompt is required");
      return;
    }
    const cleanOptions = formOptions.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      alert("Please provide at least 2 options");
      return;
    }
    if (formCorrectIndex < 0 || formCorrectIndex >= cleanOptions.length) {
      alert("Please select a valid correct answer option");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        prompt: formPrompt.trim(),
        options: cleanOptions,
        correctIndex: formCorrectIndex,
        difficulty: formDifficulty,
        category: formCategory.trim() || "general",
        isActive: formIsActive,
      };

      if (editingQuestion) {
        const res = await api.put(`/admin/quiz/questions/${editingQuestion._id}`, payload);
        const updated = res.data as Question;
        setQuestions((prev) => prev.map((q) => (q._id === updated._id ? updated : q)));
      } else {
        const res = await api.post("/admin/quiz/questions", payload);
        const created = res.data as Question;
        setQuestions((prev) => [created, ...prev]);
      }
      setModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  const updateOption = (index: number, val: string) => {
    setFormOptions((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Quiz Management</CardTitle>
            <div className="mt-1 text-sm text-text-muted">
              Add, update, or remove general knowledge questions served in the Mobile App's Earn Zone.
            </div>
          </div>
          <Button onClick={openAddModal} className="gap-2">
            <Plus className="h-4 w-4" /> Add Question
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                className="pl-9"
                placeholder="Search questions..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none min-w-[150px]"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHead>
          <div className="col-span-5">Question & Choices</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Difficulty</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </TableHead>

        {loading ? (
          <div className="p-10 grid place-items-center">
            <Spinner />
          </div>
        ) : (
          questions.map((item) => (
            <TableRow key={item._id} className="min-h-[90px] items-center">
              <div className="col-span-5 pr-4 py-1">
                <div className="font-semibold text-text line-clamp-2" title={item.prompt}>
                  {item.prompt}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {item.options.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                        oIdx === item.correctIndex
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-500 font-medium"
                          : "bg-muted/30 border-border/40 text-text-muted"
                      }`}
                    >
                      <span className="font-bold opacity-60">{String.fromCharCode(65 + oIdx)}.</span>
                      <span className="truncate">{opt}</span>
                      {oIdx === item.correctIndex && <Check className="h-3 w-3 shrink-0 ml-auto" />}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="col-span-2 capitalize font-medium text-text-muted">
                {item.category || "general"}
              </div>

              <div className="col-span-2">
                <Badge
                  variant={
                    item.difficulty === "easy"
                      ? "success"
                      : item.difficulty === "medium"
                      ? "warning"
                      : "danger"
                  }
                  className="capitalize font-semibold"
                >
                  {item.difficulty}
                </Badge>
              </div>

              <div className="col-span-1">
                {item.isActive !== false ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="default">Inactive</Badge>
                )}
              </div>

              <div className="col-span-2 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openEditModal(item)}
                  title="Edit Question"
                  className="hover:text-primary transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => deleteQuestion(item._id)}
                  title="Delete Question"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableRow>
          ))
        )}

        {!loading && !questions.length ? (
          <div className="p-12 text-center">
            <HelpCircle className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-50" />
            <div className="text-sm text-text-muted font-medium">No quiz questions found</div>
            <div className="text-xs text-text-muted/70 mt-0.5">Try widening your search terms or create one now.</div>
          </div>
        ) : null}
      </Table>

      {/* Add / Edit Modal Drawer */}
      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6 backdrop-blur-sm overflow-y-auto"
          onClick={() => setModalOpen(false)}
        >
          <form
            onSubmit={handleSave}
            className="w-full max-w-xl rounded-3xl border border-border bg-card p-0 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-primary/5 p-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-bold text-text">
                      {editingQuestion ? "Edit Quiz Question" : "Create Quiz Question"}
                    </div>
                    <div className="text-xs text-text-muted">Fill out the prompt and choices below.</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full p-1 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Prompt Text */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-1">
                  Question Prompt (Text)
                </div>
                <textarea
                  className="w-full min-h-[80px] rounded-2xl border border-border bg-muted/20 p-4 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none font-medium"
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="Type the question prompt here..."
                  required
                />
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-1 flex items-center justify-between">
                  <span>Options / Choices</span>
                  <span className="text-emerald-500 font-semibold normal-case">Select Correct Option</span>
                </div>
                <div className="space-y-2">
                  {formOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      {/* Correct Option Toggle */}
                      <button
                        type="button"
                        onClick={() => setFormCorrectIndex(idx)}
                        className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center transition-all ${
                          formCorrectIndex === idx
                            ? "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/10"
                            : "bg-muted/20 border-border hover:bg-muted/40 text-text-muted"
                        }`}
                        title={formCorrectIndex === idx ? "Correct Option" : "Mark as Correct Option"}
                      >
                        {formCorrectIndex === idx ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <span className="font-bold text-xs">{String.fromCharCode(65 + idx)}</span>
                        )}
                      </button>
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className={`h-11 ${formCorrectIndex === idx ? "border-emerald-500/35 focus:ring-emerald-500/40" : ""}`}
                        required={idx < 2} // require at least 2 options
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Category, Difficulty, Active */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-1">
                    Category
                  </div>
                  <Input
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. general, history, math"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-1">
                    Difficulty Level
                  </div>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as any)}
                    className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <label className="flex items-center justify-between rounded-2xl border border-border bg-muted/10 px-4 py-3 text-sm md:col-span-2 cursor-pointer hover:bg-muted/15 select-none transition-colors mt-2">
                  <span className="font-semibold text-text">Make this question active</span>
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                  />
                </label>
              </div>
            </div>

            <div className="bg-muted/30 p-6 flex justify-end gap-3 border-t border-border/50">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl h-11 px-6 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20"
              >
                {saving ? "Saving..." : "Save Question"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
