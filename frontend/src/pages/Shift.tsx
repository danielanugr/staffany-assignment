import React, { FunctionComponent, useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { getErrorMessage } from "../helper/error/index";
import { deleteShiftById, getShifts } from "../helper/api/shift";
import DataTable from "react-data-table-component";
import DeleteIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";
import Fab from "@material-ui/core/Fab";
import AddIcon from "@material-ui/icons/Add";
import { useHistory } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import Alert from "@material-ui/lab/Alert";
import { Link as RouterLink } from "react-router-dom";
import { calculateWeekAndYear, getWeekRange } from "../helper/calendar";
import {
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
} from "@material-ui/core";
import Box from "@material-ui/core/Box";
import { ChevronLeft, ChevronRight } from "@material-ui/icons";
import { publishWeek } from "../helper/api/week";
import { IWeek } from "../interfaces";
import { format } from "date-fns/esm";

const useStyles = makeStyles((theme) => ({
  root: {
    minWidth: 275,
  },
  fab: {
    position: "absolute",
    bottom: 40,
    right: 40,
    backgroundColor: "white",
    color: theme.color.turquoise,
  },
}));

interface ActionButtonProps {
  id: string;
  onDelete: () => void;
  disabled: boolean;
}
const ActionButton: FunctionComponent<ActionButtonProps> = ({
  id,
  onDelete,
  disabled,
}) => {
  return (
    <div>
      <IconButton
        size="small"
        aria-label="delete"
        component={RouterLink}
        to={`/shift/${id}/edit`}
        disabled={disabled}
      >
        <EditIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        aria-label="delete"
        onClick={() => onDelete()}
        disabled={disabled}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </div>
  );
};

const Shift = () => {
  const classes = useStyles();
  const history = useHistory();

  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const [currentWeek, setCurrentWeek] = useState<number>();
  const [currentYear, setCurrentYear] = useState<number>();
  const [startDate, setStartDate] = useState<string>();
  const [endDate, setEndDate] = useState<string>();
  const [weekData, setWeekData] = useState<IWeek>();
  const [published, setPublished] = useState(false);
  const [publishedDate, setPublishedDate] = useState<string>("");

  const onDeleteClick = (id: string) => {
    setSelectedId(id);
    setShowDeleteConfirm(true);
  };

  const onCloseDeleteDialog = () => {
    setSelectedId(null);
    setShowDeleteConfirm(false);
  };

  useEffect(() => {
    const getData = async () => {
      try {
        let currentDate = new Date();
        const [week, year] = calculateWeekAndYear(currentDate);
        const [firstDay, lastDay] = getWeekRange(currentDate);
        setCurrentWeek(week);
        setCurrentYear(year);
        setStartDate(firstDay);
        setEndDate(lastDay);
        setIsLoading(true);
        setErrMsg("");
        if (currentWeek && currentYear) {
          const { results } = await getShifts(currentWeek, currentYear);
          if (results.length > 0) {
            setWeekData(results[0].week);
            if (results[0].week.status === "published") {
              setPublished(true);
              let publishedDate = formatPublishedDate(
                results[0].week.updatedAt
              );
              setPublishedDate(publishedDate);
            }
          }
          setRows(results);
        }
      } catch (error) {
        const message = getErrorMessage(error);
        setErrMsg(message);
      } finally {
        setIsLoading(false);
      }
    };

    getData();
  }, [currentWeek, currentYear]);

  const columns = [
    {
      name: "Name",
      selector: "name",
      sortable: true,
    },
    {
      name: "Date",
      selector: "date",
      sortable: true,
    },
    {
      name: "Start Time",
      selector: "startTime",
      sortable: true,
    },
    {
      name: "End Time",
      selector: "endTime",
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row: any) => (
        <ActionButton
          id={row.id}
          onDelete={() => onDeleteClick(row.id)}
          disabled={row.week.status === "draft" ? false : true}
        />
      ),
    },
  ];

  const formatPublishedDate = (timestamp: string) => {
    let date = new Date(timestamp);
    return format(date, "dd MMM yyyy, HH:mm");
  };

  const deleteDataById = async () => {
    try {
      setDeleteLoading(true);
      setErrMsg("");

      if (selectedId === null) {
        throw new Error("ID is null");
      }

      await deleteShiftById(selectedId);

      const tempRows = [...rows];
      const idx = tempRows.findIndex((v: any) => v.id === selectedId);
      tempRows.splice(idx, 1);
      setRows(tempRows);
    } catch (error) {
      const message = getErrorMessage(error);
      setErrMsg(message);
    } finally {
      setDeleteLoading(false);
      onCloseDeleteDialog();
    }
  };

  const handlePublishWeek = async () => {
    try {
      if (weekData) {
        await publishWeek(weekData.id);
        setPublished(true);
      }
      if (currentWeek && currentYear) {
        const { results } = await getShifts(currentWeek, currentYear);
        if (results.length > 0) {
          setWeekData(results[0].week.id);
        }
        setRows(results);
      }
    } catch (error) {
      const message = getErrorMessage(error);
      setErrMsg(message);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card className={classes.root}>
          <CardContent>
            <Box display="flex" justifyContent="space-between">
              <Box display="flex" alignItems="center" flexGrow="1">
                <Button>
                  <ChevronLeft />
                </Button>
                <Typography component="h3">{`${startDate} - ${endDate}`}</Typography>
                <Button>
                  <ChevronRight />
                </Button>
              </Box>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="flex-end"
                flexGrow="1"
              >
                {published && (
                  <Typography
                    component="p"
                    variant="inherit"
                    style={{ marginRight: "1em" }}
                  >
                    Published at {publishedDate}
                  </Typography>
                )}
                <Button
                  variant="outlined"
                  onClick={handlePublishWeek}
                  disabled={rows.length === 0 || published ? true : false}
                >
                  Submit
                </Button>
              </Box>
            </Box>
            {errMsg?.length > 0 ? (
              <Alert severity="error">{errMsg}</Alert>
            ) : (
              <></>
            )}
            <DataTable
              columns={columns}
              data={rows}
              pagination
              progressPending={isLoading}
            />
          </CardContent>
        </Card>
      </Grid>
      <Fab
        size="medium"
        aria-label="add"
        className={classes.fab}
        onClick={() => history.push("/shift/add")}
      >
        <AddIcon />
      </Fab>
      <ConfirmDialog
        title="Delete Confirmation"
        description={`Do you want to delete this data ?`}
        onClose={onCloseDeleteDialog}
        open={showDeleteConfirm}
        onYes={deleteDataById}
        loading={deleteLoading}
      />
    </Grid>
  );
};

export default Shift;
