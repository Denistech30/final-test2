// src/TeachersTool.tsx
import React, { useState } from "react";
import {
  Container,
  Grid,
  Typography,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";

const PASSING_MARK = 10;

function TeachersTool() {
  const [students, setStudents] = useState<string[]>([]);
  const [subjects] = useState([
    { name: "Mathematics", total: 100, weight: 3 },
    { name: "Physics", total: 100, weight: 3 },
    { name: "Chemistry", total: 100, weight: 3 },
    { name: "Biology", total: 100, weight: 2 },
    { name: "English", total: 50, weight: 2 },
    { name: "History", total: 50, weight: 1 },
  ]);
  const [selectedSubjects, setSelectedSubjects] = useState<
    { name: string; total: number; weight: number }[]
  >([]);
  const [marks, setMarks] = useState<{ [subject: string]: number }[]>([]);
  const [results, setResults] = useState<
    { student: string; average: number; rank: number }[]
  >([]);
  const [classAverage, setClassAverage] = useState(0);
  const [passPercentage, setPassPercentage] = useState(0);
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [marksOpen, setMarksOpen] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);

  const handleStudentsOpen = () => setStudentsOpen(true);
  const handleMarksOpen = () => setMarksOpen(true);
  const handleSubjectsOpen = () => setSubjectsOpen(true);

  const handleStudentsClose = () => setStudentsOpen(false);
  const handleMarksClose = () => setMarksOpen(false);
  const handleSubjectsClose = () => setSubjectsOpen(false);

  const handleAddStudent = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const studentName = formData.get("studentName") as string;
    if (studentName && !students.includes(studentName)) {
      setStudents([...students, studentName]);
      setMarks([...marks, {}]);
    }
    handleStudentsClose();
  };

  const handleSubjectToggle = (subject: {
    name: string;
    total: number;
    weight: number;
  }) => {
    if (selectedSubjects.some((s) => s.name === subject.name)) {
      setSelectedSubjects(
        selectedSubjects.filter((s) => s.name !== subject.name)
      );
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const handleMarkChange = (
    studentIndex: number,
    subject: string,
    value: string
  ) => {
    const newMarks = [...marks];
    const markValue = parseFloat(value);
    newMarks[studentIndex] = {
      ...newMarks[studentIndex],
      [subject]: isNaN(markValue) ? 0 : markValue,
    };
    setMarks(newMarks);
  };

  const calculateResults = () => {
    const studentAverages = students.map((student, index) => {
      const studentMarks = marks[index];
      let weightedSum = 0;
      let totalWeight = 0;

      selectedSubjects.forEach((subject) => {
        const mark = studentMarks[subject.name];
        const scaledScore =
          (typeof mark === "number" ? mark / subject.total : 0) * 20;
        weightedSum += scaledScore * subject.weight;
        totalWeight += subject.weight;
      });

      const average = totalWeight > 0 ? weightedSum / totalWeight : 0;
      return { student, average };
    });

    const sortedAverages = [...studentAverages].sort(
      (a, b) => b.average - a.average
    );
    const resultsWithRank = sortedAverages.map((result, index) => ({
      ...result,
      rank: index + 1,
    }));

    const totalAverage = studentAverages.reduce(
      (sum, { average }) => sum + average,
      0
    );
    const classAvg = totalAverage / students.length || 0;
    const passedCount = studentAverages.filter(
      ({ average }) => average >= PASSING_MARK
    ).length;
    const passPerc = students.length
      ? (passedCount / students.length) * 100
      : 0;

    setResults(resultsWithRank);
    setClassAverage(classAvg);
    setPassPercentage(passPerc);
  };

  return (
    <Container maxWidth="lg" sx={{ padding: { xs: "10px", sm: "20px" } }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography
            variant="h4"
            gutterBottom
            sx={{ fontSize: { xs: "1.5rem", sm: "2.125rem" } }}
          >
            Teacher's Tool
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ mb: 2 }}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={handleStudentsOpen}
              fullWidth
              sx={{ minWidth: { sm: "120px" } }}
            >
              Students
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleMarksOpen}
              disabled={students.length === 0}
              fullWidth
              sx={{ minWidth: { sm: "120px" } }}
            >
              Fill Marks
            </Button>
            <Button
              variant="contained"
              color="info"
              onClick={handleSubjectsOpen}
              fullWidth
              sx={{ minWidth: { sm: "120px" } }}
            >
              Subjects
            </Button>
            <Button
              variant="contained"
              onClick={calculateResults}
              disabled={students.length === 0 || selectedSubjects.length === 0}
              fullWidth
              sx={{ minWidth: { sm: "120px" } }}
            >
              Calculate Results
            </Button>
          </Stack>
        </Grid>
        {results.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="h6">Results</Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell>Average</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.student}>
                    <TableCell>{result.rank}</TableCell>
                    <TableCell>{result.student}</TableCell>
                    <TableCell>{result.average.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Typography>Class Average: {classAverage.toFixed(2)}</Typography>
            <Typography>
              Pass Percentage: {passPercentage.toFixed(2)}%
            </Typography>
          </Grid>
        )}
      </Grid>

      <Dialog open={studentsOpen} onClose={handleStudentsClose}>
        <DialogTitle>Add Student</DialogTitle>
        <form onSubmit={handleAddStudent}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="studentName"
              label="Student Name"
              type="text"
              fullWidth
              variant="standard"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleStudentsClose}>Cancel</Button>
            <Button type="submit">Add</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={marksOpen} onClose={handleMarksClose}>
        <DialogTitle>Fill Marks</DialogTitle>
        <DialogContent>
          {students.map((student, index) => (
            <div key={student}>
              <Typography>{student}</Typography>
              {selectedSubjects.map((subject) => (
                <TextField
                  key={subject.name}
                  margin="dense"
                  label={`${subject.name} (Max: ${subject.total})`}
                  type="number"
                  fullWidth
                  variant="standard"
                  onChange={(e) =>
                    handleMarkChange(index, subject.name, e.target.value)
                  }
                  inputProps={{ min: 0, max: subject.total }}
                />
              ))}
            </div>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleMarksClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={subjectsOpen} onClose={handleSubjectsClose}>
        <DialogTitle>Select Subjects</DialogTitle>
        <DialogContent>
          {subjects.map((subject) => (
            <div key={subject.name}>
              <input
                type="checkbox"
                checked={selectedSubjects.some((s) => s.name === subject.name)}
                onChange={() => handleSubjectToggle(subject)}
              />
              <label>{`${subject.name} (Weight: ${subject.weight})`}</label>
            </div>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSubjectsClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default TeachersTool;
