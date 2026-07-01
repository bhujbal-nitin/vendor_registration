from django.urls import path
from .views import (
    RegisterView, LoginView, ChangePasswordView,
    DocumentUploadView, DocumentListView, DocumentDeleteView, DocumentDownloadView,
    RegistrationFormView,
    VendorListView, VendorDetailView, VendorReviewView,
    DocumentExtractionView, ExtractionAnalysisView, FormAnalysisView,
    AEWorkflowStatusView,
    AEAuthTestView,
)

urlpatterns = [
    path("auth/register",         RegisterView.as_view(),        name="vendor-register"),
    path("auth/login",            LoginView.as_view(),           name="vendor-login"),
    path("auth/change-password",  ChangePasswordView.as_view(),  name="vendor-change-password"),

    path("documents/upload",                       DocumentUploadView.as_view(),   name="document-upload"),
    path("documents/",                             DocumentListView.as_view(),     name="document-list"),
    path("documents/<int:document_id>/",           DocumentDeleteView.as_view(),   name="document-delete"),
    path("documents/<int:document_id>/download/",  DocumentDownloadView.as_view(), name="document-download"),

    path("registration/submit-form",  RegistrationFormView.as_view(), name="registration-form-submit"),
    path("registration/form-data",    RegistrationFormView.as_view(), name="registration-form-data"),

    path("finance/registrations/",                          VendorListView.as_view(),   name="finance-vendor-list"),
    path("finance/registrations/<int:registration_id>/",    VendorDetailView.as_view(), name="finance-vendor-detail"),
    path("finance/registrations/<int:registration_id>/review/",               VendorReviewView.as_view(),       name="finance-vendor-review"),
    path("finance/registrations/<int:registration_id>/extraction-analysis/",  ExtractionAnalysisView.as_view(), name="extraction-analysis"),
    path("finance/registrations/<int:registration_id>/form-analysis/",        FormAnalysisView.as_view(),       name="form-analysis"),

    path("documents/<int:document_id>/extraction/", DocumentExtractionView.as_view(), name="document-extraction"),

    # AE T4 integration
    path("ae/workflow-status/<int:request_id>/", AEWorkflowStatusView.as_view(), name="ae-workflow-status"),
    path("ae/auth-test/",                        AEAuthTestView.as_view(),        name="ae-auth-test"),
]
